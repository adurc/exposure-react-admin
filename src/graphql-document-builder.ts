import { DefinitionNode, DocumentNode, FieldDefinitionNode, InputValueDefinitionNode, ObjectTypeDefinitionNode, TypeNode } from 'graphql';
import { RAField, RAModel } from './interfaces';

export class GraphqlDocumentBuilder {

    public static build(models: RAModel[]): DocumentNode {
        return {
            kind: 'Document',
            definitions: [
                ...this.buildDataServerScalarTypes(),
                ...this.buildCommonTypes(),
                ...this.buildModels(models),
                this.buildQueryTypeRoot(models),
                this.buildMutationTypeRoot(models),
            ],
        };
    }


    private static buildQueryAll(model: RAModel): FieldDefinitionNode {
        return {
            kind: 'FieldDefinition',
            name: { kind: 'Name', value: `all${model.pluralTypeName}` },
            arguments: [
                {
                    kind: 'InputValueDefinition',
                    name: { kind: 'Name', value: 'page' },
                    type: {
                        kind: 'NamedType',
                        name: { kind: 'Name', value: 'Int' },
                    }
                },
                {
                    kind: 'InputValueDefinition',
                    name: { kind: 'Name', value: 'perPage' },
                    type: {
                        kind: 'NamedType',
                        name: { kind: 'Name', value: 'Int' },
                    }
                },
                {
                    kind: 'InputValueDefinition',
                    name: { kind: 'Name', value: 'sortField' },
                    type: {
                        kind: 'NamedType',
                        name: { kind: 'Name', value: 'String' },
                    }
                },
                {
                    kind: 'InputValueDefinition',
                    name: { kind: 'Name', value: 'sortOrder' },
                    type: {
                        kind: 'NamedType',
                        name: { kind: 'Name', value: 'String' },
                    }
                },
                {
                    kind: 'InputValueDefinition',
                    name: { kind: 'Name', value: 'filter' },
                    type: {
                        kind: 'NamedType',
                        name: { kind: 'Name', value: `${model.typeName}Filter` },
                    }
                }
            ],
            type: {
                kind: 'NonNullType',
                type: {
                    kind: 'ListType',
                    type: {
                        kind: 'NamedType',
                        name: { kind: 'Name', value: model.typeName },
                    }
                }
            }
        };
    }

    private static buildQueryAllMeta(model: RAModel): FieldDefinitionNode {
        return {
            kind: 'FieldDefinition',
            name: { kind: 'Name', value: `_all${model.pluralTypeName}Meta` },
            arguments: [
                {
                    kind: 'InputValueDefinition',
                    name: { kind: 'Name', value: 'page' },
                    type: {
                        kind: 'NamedType',
                        name: { kind: 'Name', value: 'Int' },
                    }
                },
                {
                    kind: 'InputValueDefinition',
                    name: { kind: 'Name', value: 'perPage' },
                    type: {
                        kind: 'NamedType',
                        name: { kind: 'Name', value: 'Int' },
                    }
                },
                {
                    kind: 'InputValueDefinition',
                    name: { kind: 'Name', value: 'sortField' },
                    type: {
                        kind: 'NamedType',
                        name: { kind: 'Name', value: 'String' },
                    }
                },
                {
                    kind: 'InputValueDefinition',
                    name: { kind: 'Name', value: 'sortOrder' },
                    type: {
                        kind: 'NamedType',
                        name: { kind: 'Name', value: 'String' },
                    }
                },
                {
                    kind: 'InputValueDefinition',
                    name: { kind: 'Name', value: 'filter' },
                    type: {
                        kind: 'NamedType',
                        name: { kind: 'Name', value: `${model.typeName}Filter` },
                    }
                }
            ],
            type: {
                kind: 'NonNullType',
                type: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'ListMetadata' },
                }
            }
        };
    }

    private static buildMutationArguments(model: RAModel, options: { includePk: boolean, includePkWithoutDefault: boolean, includeNonPk: boolean }) {
        const args: InputValueDefinitionNode[] = [];

        for (const field of model.fields) {
            if (field.info.collection) {
                continue;
            }

            if (!options.includePk && field.isPk && (!options.includePkWithoutDefault || field.hasDefault)) {
                continue;
            } else if (!options.includeNonPk && !field.isPk) {
                continue;
            }

            if (typeof field.info.type !== 'string') {
                continue;
            }

            let fieldType: TypeNode = {
                kind: 'NamedType',
                name: { kind: 'Name', value: this.transformDataServerTypeIntoGraphQLType(field.info.type as string) }
            };

            if (field.info.nonNull && !field.hasDefault) {
                fieldType = {
                    kind: 'NonNullType',
                    type: fieldType,
                };
            }

            args.push({
                kind: 'InputValueDefinition',
                name: {
                    kind: 'Name',
                    value: field.name,
                },
                type: fieldType,
            });
        }

        return args;
    }

    private static buildMutationCreate(models: RAModel[], model: RAModel): FieldDefinitionNode {
        return {
            kind: 'FieldDefinition',
            name: { kind: 'Name', value: `create${model.typeName}` },
            arguments: this.buildMutationArguments(model, { includePk: false, includePkWithoutDefault: true, includeNonPk: true }),
            type: {
                kind: 'NonNullType',
                type: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: model.typeName },
                }
            }
        };
    }

    private static buildMutationUpdate(models: RAModel[], model: RAModel): FieldDefinitionNode {
        return {
            kind: 'FieldDefinition',
            name: { kind: 'Name', value: `update${model.typeName}` },
            arguments: this.buildMutationArguments(model, { includePk: true, includePkWithoutDefault: true, includeNonPk: true }),
            type: {
                kind: 'NonNullType',
                type: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: model.typeName },
                }
            }
        };
    }

    private static buildMutationDelete(models: RAModel[], model: RAModel): FieldDefinitionNode {
        return {
            kind: 'FieldDefinition',
            name: { kind: 'Name', value: `delete${model.typeName}` },
            arguments: this.buildMutationArguments(model, { includePk: true, includePkWithoutDefault: true, includeNonPk: false }),
            type: {
                kind: 'NamedType',
                name: { kind: 'Name', value: model.typeName },
            },
        };
    }

    private static buildMutationTypeRoot(models: RAModel[]): DefinitionNode {
        const mutations: FieldDefinitionNode[] = [];

        for (const model of models) {
            mutations.push(this.buildMutationCreate(models, model));
            mutations.push(this.buildMutationUpdate(models, model));
            mutations.push(this.buildMutationDelete(models, model));
        }

        const output: DefinitionNode = {
            kind: 'ObjectTypeDefinition',
            name: { kind: 'Name', value: 'Mutation' },
            fields: mutations,
        };

        return output;
    }

    private static buildModels(models: RAModel[]): DefinitionNode[] {
        const output: DefinitionNode[] = [];

        for (const model of models) {
            output.push(this.buildModelObject(models, model));
            output.push(this.buildModelFilter(model));
        }

        return output;
    }

    private static buildDataServerScalarTypes() {
        const output: DefinitionNode[] = [];

        const dataServerTypes = ['Date', 'Buffer'];

        for (const type of dataServerTypes) {
            output.push({
                kind: 'ScalarTypeDefinition',
                name: { kind: 'Name', value: type },
            });
        }

        return output;
    }

    private static buildCommonTypes(): DefinitionNode[] {
        const output: DefinitionNode[] = [];
        output.push(this.buildListMetadata());
        return output;
    }

    private static buildListMetadata(): ObjectTypeDefinitionNode {
        return {
            kind: 'ObjectTypeDefinition',
            name: { kind: 'Name', value: 'ListMetadata' },
            fields: [
                {
                    kind: 'FieldDefinition',
                    name: { kind: 'Name', value: 'count' },
                    type: {
                        kind: 'NonNullType',
                        type: {
                            kind: 'NamedType',
                            name: { kind: 'Name', value: 'Int' },
                        }
                    }
                }
            ]
        };
    }

    private static buildQueryTypeRootFindByPK(model: RAModel, pks: RAField[]): FieldDefinitionNode {
        return {
            kind: 'FieldDefinition',
            name: { kind: 'Name', value: model.typeName },
            arguments: pks.map<InputValueDefinitionNode>(x => ({
                kind: 'InputValueDefinition',
                name: { kind: 'Name', value: x.name },
                type: {
                    kind: 'NonNullType',
                    type: {
                        kind: 'NamedType',
                        name: { kind: 'Name', value: this.transformDataServerTypeIntoGraphQLType(x.info.type as string) },
                    }
                }
            })),
            type: {
                kind: 'NamedType',
                name: { kind: 'Name', value: model.typeName },
            }
        };
    }

    private static buildQueryTypeRoot(models: RAModel[]): DefinitionNode {
        const fieldDefinition: FieldDefinitionNode[] = [];

        for (const model of models) {
            const pks = model.fields.filter(x => x.info.directives.findIndex(x => x.name === 'pk') >= 0);

            fieldDefinition.push(this.buildQueryAll(model));
            fieldDefinition.push(this.buildQueryAllMeta(model));

            if (pks.length > 0) {
                fieldDefinition.push(this.buildQueryTypeRootFindByPK(model, pks));
            }
        }

        const output: DefinitionNode = {
            kind: 'ObjectTypeDefinition',
            name: { kind: 'Name', value: 'Query' },
            fields: fieldDefinition,
        };

        return output;
    }

    private static buildModelObject(models: RAModel[], model: RAModel): DefinitionNode {
        const fields = model.fields
            .filter(x => typeof x.info.type !== 'object')
            .map(x => this.serializeFieldObject(models, x));

        if (model.serializeId) {
            fields.push({
                kind: 'FieldDefinition',
                name: { kind: 'Name', value: 'id' },
                type: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'ID' }
                }
            });
        }

        return {
            kind: 'ObjectTypeDefinition',
            name: { kind: 'Name', value: model.typeName },
            fields,
        };
    }

    private static buildModelFilter(model: RAModel): DefinitionNode {
        const fields: InputValueDefinitionNode[] = [{
            kind: 'InputValueDefinition',
            name: { kind: 'Name', value: 'q' },
            type: {
                kind: 'NamedType',
                name: { kind: 'Name', value: 'String' }
            }
        }, {
            kind: 'InputValueDefinition',
            name: { kind: 'Name', value: 'ids' },
            type: {
                kind: 'ListType',
                type: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'ID' }
                }
            }
        }];

        const operators = ['lt', 'lte', 'gt', 'gte'];

        for (const field of model.fields) {
            if (field.info.collection) {
                continue;
            }

            if (typeof field.info.type !== 'string') {
                continue;
            }

            const graphqlType = this.transformDataServerTypeIntoGraphQLType(field.info.type as string);
            const hasOperators = graphqlType === 'Int';

            fields.push({
                kind: 'InputValueDefinition',
                name: { kind: 'Name', value: field.name },
                type: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: graphqlType }
                }
            });

            if (hasOperators) {
                for (const operator of operators) {
                    fields.push({
                        kind: 'InputValueDefinition',
                        name: { kind: 'Name', value: `${field.name}_${operator}` },
                        type: {
                            kind: 'NamedType',
                            name: { kind: 'Name', value: graphqlType }
                        }
                    });
                }
            }
        }

        if (model.serializeId) {
            fields.push({
                kind: 'InputValueDefinition',
                name: { kind: 'Name', value: 'id' },
                type: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: 'ID' }
                }
            });
        }

        return {
            kind: 'InputObjectTypeDefinition',
            name: { kind: 'Name', value: `${model.typeName}Filter` },
            fields,
        };
    }


    private static serializeFieldObject(models: RAModel[], field: RAField) {
        const modelDestReference = typeof field.info.type === 'object' ? field.info.type : null;
        const modelDest = modelDestReference ? models.find(x => x.info.name === modelDestReference.model) : null;

        let type: TypeNode = {
            kind: 'NamedType',
            name: { kind: 'Name', value: modelDest ? modelDest.typeName : this.transformDataServerTypeIntoGraphQLType(field.info.type as string) }
        };

        if (field.info.collection) {
            type = {
                kind: 'ListType',
                type,
            };
        }

        if (field.info.nonNull) {
            type = {
                kind: 'NonNullType',
                type,
            };
        }

        const output: FieldDefinitionNode = {
            kind: 'FieldDefinition',
            name: { kind: 'Name', value: field.info.collection ? field.manyFieldName : field.name },
            arguments: [],
            type,
        };
        return output;
    }

    private static transformDataServerTypeIntoGraphQLType(valueType: string): string {
        switch (valueType) {
            case 'string':
                return 'String';
            case 'boolean':
                return 'Boolean';
            case 'uuid':
                return 'ID';
            case 'int':
                return 'Int';
            case 'float':
                return 'Float';
            case 'date':
                return 'Date';
            case 'buffer':
                return 'Buffer';
            default:
                throw new Error(`Unknown value type ${valueType}`);
        }
    }
}