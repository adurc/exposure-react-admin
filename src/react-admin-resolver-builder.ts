import { IFieldResolver, IResolvers } from 'graphql-tools';
import { RAModel } from './interfaces';
import { Adurc } from '@adurc/core/dist/adurc';
import { AdurcFindManyArgs } from '@adurc/core/dist/interfaces/client/find-many.args';
import { FieldNode } from 'graphql';

export class ReactAdminResolverBuilder {

    static build(adurc: Adurc, models: RAModel[]): IResolvers {
        const resolvers: IResolvers = { Query: {}, Mutation: {} };

        for (const model of models) {
            resolvers.Query[model.typeName] = this.buildFindOneResolver(model);
            resolvers.Query[`all${model.pluralTypeName}`] = this.buildFindManyResolver(adurc, model);
            resolvers.Query[`_all${model.pluralTypeName}Meta`] = this.buildFindMetaResolver(model);
            resolvers.Mutation[`create${model.typeName}`] = this.buildCreateResolver(model);
            resolvers.Mutation[`update${model.typeName}`] = this.buildUpdateResolver(adurc, models, model);
            resolvers.Mutation[`delete${model.typeName}`] = this.buildDeleteResolver(model);
        }

        return resolvers;
    }

    private static buildDeleteResolver(_model: RAModel): IFieldResolver<unknown, unknown> {
        return async (_source, _args, _context, _info) => {
            // const fieldNode: FieldNode = info.fieldNodes[0];
            // const projection = ProjectionParser.parseField(fieldNode, info.variableValues);
            // projection.name = model.accessorName;
            // const result = await this.dataServer.updateMany(projection);
            // return this.processOutput(result);
        };
    }

    private static buildUpdateResolver(_adurc: Adurc, _models: RAModel[], _model: RAModel): IFieldResolver<unknown, unknown> {
        return async (_source, _args, _context, _info) => {
            // const fieldNode: FieldNode = info.fieldNodes[0];
            // const projection = ProjectionParser.parseField(fieldNode, info.variableValues);
            // projection.name = model.accessorName;
            // const result = await this.dataServer.updateMany(projection);
            // return this.processOutput(result);
        };
    }

    private static buildCreateResolver(_model: RAModel): IFieldResolver<unknown, unknown> {
        return async (_source, _args, _context, _info) => {
            // const fieldNode: FieldNode = info.fieldNodes[0];
            // const projection = ProjectionParser.parseField(fieldNode, info.variableValues);
            // projection.name = model.accessorName;
            // const result = await this.dataServer.updateMany(projection);
            // return this.processOutput(result);
        };
    }

    private static buildFindMetaResolver(_model: RAModel): IFieldResolver<unknown, unknown> {
        return async (_source, _args) => {
            // const fieldNode: FieldNode = info.fieldNodes[0];
            // const projection = ProjectionParser.parseField(fieldNode, info.variableValues);
            // projection.name = model.accessorName;
            // const result = await this.dataServer.updateMany(projection);
            // return this.processOutput(result);
        };
    }

    private static buildFindOneResolver(_model: RAModel): IFieldResolver<unknown, unknown> {
        return async (_source, _args, _context, _info) => {
            // const fieldNode: FieldNode = info.fieldNodes[0];
            // const projection = ProjectionParser.parseFindAllField(this.models, model, model.info.name, fieldNode, info.variableValues);
            // projection.args = {
            //     limit: 1,
            //     where: { id: { _eq: args.id } }
            // };
            // const result = await this.adurc.read(projection);
            // if (result.length === 0) {
            //     return null;
            // }
            // const output = OutputTransform.transform(this.models, model, fieldNode, result[0]);
            // return output;
        };
    }

    private static buildFindManyResolver(adurc: Adurc, model: RAModel): IFieldResolver<unknown, unknown> {
        return async (_source, args, _context, info) => {
            const fieldNode: FieldNode = info.fieldNodes[0];
            console.log('[exposure-react-admin] find many: ' + JSON.stringify(fieldNode));
            console.log('[exposure-react-admin] arguments: ' + JSON.stringify(args));

            const findManyArgs: AdurcFindManyArgs = {
                select: {},
            };

            for (const selection of fieldNode.selectionSet.selections) {
                if (selection.kind !== 'Field') {
                    continue;
                }
                const field = model.fields.find(x => x.name === selection.name.value);
                findManyArgs.select[field.info.name] = true;
            }

            if ('filter' in args) {
                findManyArgs.where = {};
                for (const fieldName in args.filter) {
                    const field = model.fields.find(x => x.name === fieldName);
                    findManyArgs.where[field.info.name] = args.filter[fieldName];
                }
            }

            if ('page' in args && 'perPage' in args) {
                findManyArgs.skip = (args.perPage as number) * (args.page as number);
                findManyArgs.take = args.perPage as number;
            }

            if ('sortField' in args && 'sortOrder' in args) {
                const field = model.fields.find(x => x.name === args.sortField);
                findManyArgs.orderBy = { [field.info.name]: args.sortOrder === 'DESC' ? 'DESC' : 'ASC' };
            }

            console.log('[exposure-react-admin] adurc args: ' + JSON.stringify(findManyArgs));

            // TODO: pending fix adurc core types
            const result = await adurc.client[model.adurcClientFieldName].findMany(findManyArgs) as Record<string, unknown>[];

            const output: Record<string, unknown>[] = [];

            for (const adurcItem of result) {
                const raItem: Record<string, unknown> = {};
                for (const adurcField in adurcItem) {
                    const field = model.fields.find(x => x.info.name === adurcField);
                    raItem[field.name] = adurcItem[adurcField];
                }
                output.push(raItem);
            }

            return output;
        };
    }
}