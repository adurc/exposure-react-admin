import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { RAField, RAModel } from './interfaces';
import pascalcase from 'pascalcase';
import { snakeCase } from 'snake-case';
import pluralize from 'pluralize';
import camelCase from 'camelcase';

export class ReactAdminModelBuilder {

    public static build(models: AdurcModel[]): RAModel[] {
        const output: RAModel[] = [];

        for (const model of models) {
            const pascalName = pascalcase(model.name);

            const fields = model.fields.map<RAField>(c => {
                const directives = c.directives.filter(x => x.provider === 'ra');
                const hasDefault = directives.findIndex(x => x.name === 'has_default') >= 0;
                const isPk = directives.findIndex(x => x.name === 'pk') >= 0;

                return {
                    info: c,
                    hasDefault,
                    isPk,
                    name: snakeCase(c.name),
                    manyFieldName: c.collection ? pascalcase(pluralize(c.name)) : undefined,
                };
            });

            const reactAdminModel: RAModel = {
                info: model,
                typeName: pascalName,
                adurcClientFieldName: camelCase(model.name),
                pluralTypeName: pluralize(pascalName),
                pkFields: fields.filter(x => x.isPk),
                fields,
            };

            if (reactAdminModel.pkFields.length === 0) {
                console.warn(`[exposure-react-admin] Model ${model.name} can not be registered because not have a primary key directive`);
                continue;
            }

            if (reactAdminModel.pkFields.length === 1 && reactAdminModel.pkFields[0].info.name !== 'id') {
                reactAdminModel.serializeId = (item) => {
                    return item[reactAdminModel.pkFields[0].info.name] as string | number;
                };
                reactAdminModel.deserializeId = (value: string | number) => {
                    return { [reactAdminModel.pkFields[0].info.name]: value };
                };
            } else if (reactAdminModel.pkFields.length > 1 && reactAdminModel.pkFields.findIndex(x => x.name === 'id') === -1) {
                reactAdminModel.serializeId = (item) => {
                    const temp: string = reactAdminModel.pkFields.map(x => item[x.info.name].toString()).join('#');
                    return Buffer.from(temp).toString('base64');
                };
                reactAdminModel.deserializeId = (value: string | number) => {
                    const data = Buffer.from(value as string, 'base64').toString('utf8').split('#');
                    const output: Record<string, unknown> = {};
                    for (let i = 0; i < reactAdminModel.pkFields.length; i++) {
                        const pk = reactAdminModel.pkFields[i];
                        switch (pk.info.type) {
                            case 'int':
                                output[pk.info.name] = parseInt(data[i]);
                                break;
                            default:
                                output[pk.info.name] = data[i];
                                break;
                        }
                    }
                    return output;
                };
            }

            output.push(reactAdminModel);
        }

        return output;
    }
}