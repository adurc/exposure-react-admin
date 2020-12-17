import { Adurc } from '@adurc/core';
import { ProjectionInfo } from '@adurc/core/dist/interfaces/projection';
import { ApolloServer, IResolvers, ServerRegistration } from 'apollo-server-express';
import { DefinitionNode, DocumentNode, FieldDefinitionNode, FieldNode, InputValueDefinitionNode, ObjectTypeDefinitionNode, TypeNode } from 'graphql';
import pascalcase from 'pascalcase';
import pluralize from 'pluralize';
import { snakeCase } from 'snake-case';
import { RAField, RAModel } from './interfaces';
import { GraphQLExposureOptions } from './options';
import { OutputTransform } from './output.transform';
import { ProjectionParser } from './projection.parser';

export class ReactAdminExposure {

    private apolloServer: ApolloServer;
    private models: RAModel[] = [];

    public get adurc(): Adurc {
        return this.options.adurc;
    }

    constructor(
        private options: GraphQLExposureOptions,
    ) {
        this.buildReactAdminModels();
        this.apolloServer = new ApolloServer({
            playground: true,
            typeDefs: this.buildDocument(),
            resolvers: this.buildResolvers(),
        });
    }

    public applyMiddleware(options: ServerRegistration): void {
        this.apolloServer.applyMiddleware(options);
    }

    private buildReactAdminModels() {
        for (const model of this.options.adurc.models) {
            const pascalName = pascalcase(model.name);

            const fields = model.fields.map<RAField>(c => {
                const isComputed = c.directives.findIndex(x => x.name === 'computed') >= 0;
                const isPk = c.directives.findIndex(x => x.name === 'pk') >= 0;

                return {
                    info: c,
                    isComputed,
                    isPk,
                    name: snakeCase(c.name),
                    manyFieldName: c.collection ? pascalcase(pluralize(c.name)) : undefined,
                };
            });

            const reactAdminModel: RAModel = {
                info: model,
                typeName: pascalName,
                pluralTypeName: pluralize(pascalName),
                pkFields: fields.filter(x => x.isPk),
                fields,
            };

            if (reactAdminModel.pkFields.length === 0) {
                console.warn(`Model ${model.name} can not be registered because not have a primary key directive`);
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

            this.models.push(reactAdminModel);
        }
    }

    private buildDocument(): DocumentNode {
        return {
            kind: 'Document',
            definitions: [
                ...this.buildDataServerScalarTypes(),
                ...this.buildCommonTypes(),
                ...this.buildModels(),
                this.buildQueryTypeRoot(),
                this.buildMutationTypeRoot(),
            ],
        };
    }

    private buildCommonTypes(): DefinitionNode[] {
        const output: DefinitionNode[] = [];
        output.push(this.buildListMetadata());
        return output;
    }

    private buildListMetadata(): ObjectTypeDefinitionNode {
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

    private buildResolvers() {
        const resolvers: IResolvers = { Query: {}, Mutation: {} };

        for (const model of this.models) {
            resolvers.Query[model.typeName] = this.buildFindOneResolver(model);
            resolvers.Query[`all${model.pluralTypeName}`] = this.buildFindManyResolver(model);
            resolvers.Query[`_all${model.pluralTypeName}Meta`] = this.buildFindMetaResolver(model);
            resolvers.Mutation[`create${model.typeName}`] = this.buildCreateResolver(model);
            resolvers.Mutation[`update${model.typeName}`] = this.buildUpdateResolver(model);
            resolvers.Mutation[`delete${model.typeName}`] = this.buildDeleteResolver(model);
        }

        return resolvers;
    }

    private buildDeleteResolver(_model: RAModel) {
        return async (_source, _args, _context, _info) => {
            // const fieldNode: FieldNode = info.fieldNodes[0];
            // const projection = ProjectionParser.parseField(fieldNode, info.variableValues);
            // projection.name = model.accessorName;
            // const result = await this.dataServer.updateMany(projection);
            // return this.processOutput(result);
        };
    }

    private buildUpdateResolver(model: RAModel) {
        return async (_source, args, _context, info) => {
            const fieldNode: FieldNode = info.fieldNodes[0];
            const projection = ProjectionParser.parseField(this.models, model, model.info.name, fieldNode, info.variableValues);

            const id = args.id;
            delete args.id;

            projection.args = {
                _set: ProjectionParser.parseSet(model, args),
                where: { id: { _eq: id } }
            };

            projection.fields = [
                {
                    type: 'expand',
                    name: 'returning',
                    fields: projection.fields,
                }
            ];

            const result = await this.adurc.updateMany(projection);
            if (result.returning.length === 0) {
                return null;
            }

            const output = OutputTransform.transform(this.models, model, fieldNode, result.returning[0]);

            return output;
        };
    }


    private buildCreateResolver(_model: RAModel) {
        return async (_source, _args, _context, _info) => {
            // const fieldNode: FieldNode = info.fieldNodes[0];
            // const projection = ProjectionParser.parseField(fieldNode, info.variableValues);
            // projection.name = model.accessorName;
            // const result = await this.dataServer.updateMany(projection);
            // return this.processOutput(result);
        };
    }

    private buildFindMetaResolver(model: RAModel) {
        return async (_source, _args) => {
            const projection: ProjectionInfo = {
                name: model.info.name,
                type: 'expand',
                args: {
                    where: _args.filter ? ProjectionParser.parseFilter(this.models, model, _args.filter) : undefined,
                },
                fields: [
                    {
                        type: 'expand',
                        name: 'aggregate',
                        fields: [
                            {
                                type: 'field',
                                name: 'count'
                            }
                        ]
                    },
                ]
            };

            const result = await this.adurc.aggregate(projection);

            return {
                count: result.aggregate.count,
            };
        };
    }

    private buildFindOneResolver(model: RAModel) {
        return async (_source, args, _context, info) => {
            const fieldNode: FieldNode = info.fieldNodes[0];
            const projection = ProjectionParser.parseField(this.models, model, model.info.name, fieldNode, info.variableValues);
            projection.args = {
                limit: 1,
                where: { id: { _eq: args.id } }
            };
            const result = await this.adurc.read(projection);
            if (result.length === 0) {
                return null;
            }
            const output = OutputTransform.transform(this.models, model, fieldNode, result[0]);
            return output;
        };
    }

    private buildFindManyResolver(model: RAModel) {
        return async (_source, _args, _context, info) => {
            const fieldNode: FieldNode = info.fieldNodes[0];
            const projection = ProjectionParser.parseField(this.models, model, model.info.name, fieldNode, info.variableValues);
            const result = await this.adurc.read(projection);
            const output = result.map(x => OutputTransform.transform(this.models, model, fieldNode, x));
            return output;
        };
    }

    private buildDataServerScalarTypes() {
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

    private buildQueryAll(model: RAModel): FieldDefinitionNode {
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

    private buildQueryAllMeta(model: RAModel): FieldDefinitionNode {
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

    private buildQueryTypeRootFindByPK(model: RAModel, pks: RAField[]): FieldDefinitionNode {
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
                        name: { kind: 'Name', value: ProjectionParser.transformDataServerTypeIntoGraphQLType(x.info.type) },
                    }
                }
            })),
            type: {
                kind: 'NamedType',
                name: { kind: 'Name', value: model.typeName },
            }
        };
    }

    private buildQueryTypeRoot(): DefinitionNode {
        const fieldDefinition: FieldDefinitionNode[] = [];

        for (const model of this.models) {
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

    private buildMutationArguments(model: RAModel, options: { includePk: boolean, includeNonPk: boolean }) {
        const args: InputValueDefinitionNode[] = [];

        for (const field of model.fields) {
            if (field.info.collection) {
                continue;
            }

            const isPK = field.info.directives.findIndex(x => x.name === 'pk') >= 0;
            if (!options.includePk && isPK) {
                continue;
            } else if (!options.includeNonPk && !isPK) {
                continue;
            }

            const modelType = this.models.find(x => x.info.name === field.info.type);

            if (modelType) {
                continue;
            }

            let fieldType: TypeNode = {
                kind: 'NamedType',
                name: { kind: 'Name', value: ProjectionParser.transformDataServerTypeIntoGraphQLType(field.info.type) }
            };

            if (field.info.nonNull) {
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

    private buildMutationCreate(model: RAModel): FieldDefinitionNode {
        return {
            kind: 'FieldDefinition',
            name: { kind: 'Name', value: `create${model.typeName}` },
            arguments: this.buildMutationArguments(model, { includePk: false, includeNonPk: true }),
            type: {
                kind: 'NonNullType',
                type: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: model.typeName },
                }
            }
        };
    }

    private buildMutationUpdate(model: RAModel): FieldDefinitionNode {
        return {
            kind: 'FieldDefinition',
            name: { kind: 'Name', value: `update${model.typeName}` },
            arguments: this.buildMutationArguments(model, { includePk: true, includeNonPk: true }),
            type: {
                kind: 'NonNullType',
                type: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: model.typeName },
                }
            }
        };
    }

    private buildMutationDelete(model: RAModel): FieldDefinitionNode {
        return {
            kind: 'FieldDefinition',
            name: { kind: 'Name', value: `delete${model.typeName}` },
            arguments: this.buildMutationArguments(model, { includePk: true, includeNonPk: false }),
            type: {
                kind: 'NonNullType',
                type: {
                    kind: 'NamedType',
                    name: { kind: 'Name', value: model.typeName },
                }
            }
        };
    }

    private buildMutationTypeRoot(): DefinitionNode {
        const mutations: FieldDefinitionNode[] = [];

        for (const model of this.models) {
            mutations.push(this.buildMutationCreate(model));
            mutations.push(this.buildMutationUpdate(model));
            mutations.push(this.buildMutationDelete(model));
        }

        const output: DefinitionNode = {
            kind: 'ObjectTypeDefinition',
            name: { kind: 'Name', value: 'Mutation' },
            fields: mutations,
        };

        return output;
    }

    private isModelType(type: string) {
        return this.adurc.models.findIndex(x => x.name === type) >= 0;
    }

    private buildModelObject(model: RAModel): DefinitionNode {
        const fields = model.fields
            .filter(x => !this.isModelType(x.info.type))
            .map(x => this.serializeFieldObject(x));

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


    private buildModelFilter(model: RAModel): DefinitionNode {
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

            const modelType = this.models.find(x => x.info.name === field.info.type);

            if (modelType) {
                continue;
            }

            const graphqlType = ProjectionParser.transformDataServerTypeIntoGraphQLType(field.info.type);
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

    private buildModels(): DefinitionNode[] {
        const output: DefinitionNode[] = [];

        for (const model of this.models) {
            output.push(this.buildModelObject(model));
            output.push(this.buildModelFilter(model));
        }

        return output;
    }

    private serializeFieldObject(field: RAField) {
        const modelDest = this.models.find(x => x.info.name === field.info.type);

        let type: TypeNode = {
            kind: 'NamedType',
            name: { kind: 'Name', value: modelDest ? modelDest.typeName : ProjectionParser.transformDataServerTypeIntoGraphQLType(field.info.type) }
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
}