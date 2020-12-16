import { IResolvers } from 'graphql-tools';
import { RAModel } from './interfaces';
import { Adurc } from '@adurc/core/dist/adurc';

export class ReactAdminResolverBuilder {

    static build(adurc: Adurc, models: RAModel[]): IResolvers {
        const resolvers: IResolvers = { Query: {}, Mutation: {} };

        for (const model of models) {
            resolvers.Query[model.typeName] = this.buildFindOneResolver(model);
            resolvers.Query[`all${model.pluralTypeName}`] = this.buildFindManyResolver(model);
            resolvers.Query[`_all${model.pluralTypeName}Meta`] = this.buildFindMetaResolver(model);
            resolvers.Mutation[`create${model.typeName}`] = this.buildCreateResolver(model);
            resolvers.Mutation[`update${model.typeName}`] = this.buildUpdateResolver(adurc, models, model);
            resolvers.Mutation[`delete${model.typeName}`] = this.buildDeleteResolver(model);
        }

        return resolvers;
    }

    private static buildDeleteResolver(_model: RAModel) {
        return async (_source, _args, _context, _info) => {
            // const fieldNode: FieldNode = info.fieldNodes[0];
            // const projection = ProjectionParser.parseField(fieldNode, info.variableValues);
            // projection.name = model.accessorName;
            // const result = await this.dataServer.updateMany(projection);
            // return this.processOutput(result);
        };
    }

    private static buildUpdateResolver(_adurc: Adurc, _models: RAModel[], _model: RAModel) {
        return async (_source, _args, _context, _info) => {
            // const fieldNode: FieldNode = info.fieldNodes[0];
            // const projection = ProjectionParser.parseField(fieldNode, info.variableValues);
            // projection.name = model.accessorName;
            // const result = await this.dataServer.updateMany(projection);
            // return this.processOutput(result);
        };
    }

    private static buildCreateResolver(_model: RAModel) {
        return async (_source, _args, _context, _info) => {
            // const fieldNode: FieldNode = info.fieldNodes[0];
            // const projection = ProjectionParser.parseField(fieldNode, info.variableValues);
            // projection.name = model.accessorName;
            // const result = await this.dataServer.updateMany(projection);
            // return this.processOutput(result);
        };
    }

    private static buildFindMetaResolver(_model: RAModel) {
        return async (_source, _args) => {
            // const fieldNode: FieldNode = info.fieldNodes[0];
            // const projection = ProjectionParser.parseField(fieldNode, info.variableValues);
            // projection.name = model.accessorName;
            // const result = await this.dataServer.updateMany(projection);
            // return this.processOutput(result);
        };
    }

    private static buildFindOneResolver(_model: RAModel) {
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

    private static buildFindManyResolver(_model: RAModel) {
        return async (_source, _args, _context, _info) => {
            // const fieldNode: FieldNode = info.fieldNodes[0];
            // const projection = ProjectionParser.parseField(fieldNode, info.variableValues);
            // projection.name = model.accessorName;
            // const result = await this.dataServer.updateMany(projection);
            // return this.processOutput(result);
        };
    }
}