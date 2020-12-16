import { FieldNode, SelectionSetNode } from 'graphql';
import { RAModel } from './interfaces';

export class OutputTransform {

    public static transform(models: RAModel[], model: RAModel, field: FieldNode, data: Record<string, unknown>): Record<string, unknown> {
        const output: Record<string, unknown> = {};

        this.transformSelectionSet(models, model, field.selectionSet, data, output);

        return output;
    }

    public static transformSelectionSet(models: RAModel[], model: RAModel, set: SelectionSetNode, data: Record<string, unknown>, output: Record<string, unknown>): void {

        for (const selection of set.selections) {
            if (selection.kind !== 'Field') {
                continue;
            }

            if (selection.name.value === '__typename') {
                continue;
            }

            if (selection.name.value === 'id' && model.serializeId) {
                output['id'] = model.serializeId(data);
                continue;
            }

            const field = model.fields.find(x => x.name === selection.name.value || x.manyFieldName === selection.name.value);
            const value = data[field.info.name];

            if (!selection.selectionSet) {
                output[field.name] = value;
            } else if (value !== null && value !== undefined) {
                if (field.info.collection && !(value instanceof Array)) {
                    throw new Error(`Expected array value in field: ${selection.name.value}`);
                } else if (!field.info.collection && value instanceof Array) {
                    throw new Error(`Expected object value in field ${selection.name.value}`);
                }

                const modelRel = models.find(x => x.info.name === field.info.type);

                if (field.info.collection) {
                    const temp = output[field.manyFieldName] = [];
                    for (const item of value as Array<Record<string, unknown>>) {
                        temp.push(this.transform(models, modelRel, selection, item));
                    }
                } else {
                    output[field.name] = this.transform(models, modelRel, selection, value as Record<string, unknown>);
                }
            }
        }

    }

}