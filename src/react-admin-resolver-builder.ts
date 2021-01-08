import { IFieldResolver, IResolvers } from 'graphql-tools';
import { RAModel } from './interfaces';
import { AdurcFindManyArgs } from '@adurc/core/dist/interfaces/client/find-many.args';
import { FieldNode } from 'graphql';
import { AdurcAggregateArgs } from '@adurc/core/dist/interfaces/client/aggregate.args';
import { AdurcCreateArgs } from '@adurc/core/dist/interfaces/client/create.args';
import { AdurcUpdateArgs } from '@adurc/core/dist/interfaces/client/update.args';
import { AdurcDeleteArgs } from '@adurc/core/dist/interfaces/client/delete.args';
import { AdurcModelWhere } from '@adurc/core/dist/interfaces/client/where';
import { AdurcModelUntyped } from '@adurc/core/dist/interfaces/client/model';
import { Adurc } from '@adurc/core';
import { IAdurcLogger } from '@adurc/core/dist/interfaces/logger';

export class ReactAdminResolverBuilder {

    static logger: IAdurcLogger;

    static build(adurc: Adurc, models: RAModel[]): IResolvers {
        const resolvers: IResolvers = { Query: {}, Mutation: {} };

        for (const model of models) {
            resolvers.Query[model.typeName] = this.buildFindOneResolver(adurc, model);
            resolvers.Query[`all${model.pluralTypeName}`] = this.buildFindManyResolver(adurc, model);
            resolvers.Query[`_all${model.pluralTypeName}Meta`] = this.buildFindMetaResolver(adurc, model);
            resolvers.Mutation[`create${model.typeName}`] = this.buildCreateResolver(adurc, model);
            resolvers.Mutation[`update${model.typeName}`] = this.buildUpdateResolver(adurc, model);
            resolvers.Mutation[`delete${model.typeName}`] = this.buildDeleteResolver(adurc, model);
        }

        return resolvers;
    }

    private static buildDeleteResolver(adurc: Adurc, model: RAModel): IFieldResolver<unknown, unknown> {
        return async (_source, args, _context, info) => {
            const fieldNode: FieldNode = info.fieldNodes[0];
            this.logger.debug('[exposure-react-admin] invoked delete model: ' + model.info.name, { node: fieldNode, args });

            const item: Record<string, unknown> = {};
            const deleteArgs: AdurcDeleteArgs = {
                select: {},
                where: {},
            };

            const fieldsPk = model.deserializeId ? model.deserializeId(args.id) : { id: args.id };
            deleteArgs.where = { ...fieldsPk };

            for (const arg in args) {
                const field = model.fields.find(x => x.name === arg);
                item[field.info.accessorName] = args[arg];
            }

            for (const selection of fieldNode.selectionSet.selections) {
                if (selection.kind !== 'Field' || ['__typename'].indexOf(selection.name.value) >= 0) {
                    continue;
                }
                const field = model.fields.find(x => x.name === selection.name.value);
                deleteArgs.select[field.info.accessorName] = true;
            }

            const result = await adurc.client[model.info.accessorName].deleteMany(deleteArgs);

            if (result.returning.length > 0) {
                const raItem: Record<string, unknown> = {};
                for (const adurcField in result.returning[0]) {
                    const field = model.fields.find(x => x.info.accessorName === adurcField);
                    raItem[field.name] = result.returning[0][adurcField];
                }
                return raItem;
            }

            return null;
        };
    }

    private static buildUpdateResolver(adurc: Adurc, model: RAModel): IFieldResolver<unknown, unknown> {
        return async (_source, args, _context, info) => {
            const fieldNode: FieldNode = info.fieldNodes[0];
            this.logger.debug('[exposure-react-admin] invoked update model: ' + model.info.name, { node: fieldNode, args });

            const item: Record<string, unknown> = {};
            const updateArgs: AdurcUpdateArgs = {
                set: item,
                select: {},
                where: {},
            };

            const fieldsPk = model.deserializeId ? model.deserializeId(args.id) : { id: args.id };
            updateArgs.where = { ...fieldsPk };

            for (const arg in args) {
                const field = model.fields.find(x => x.name === arg);
                item[field.info.accessorName] = args[arg];
            }

            for (const selection of fieldNode.selectionSet.selections) {
                if (selection.kind !== 'Field' || ['__typename'].indexOf(selection.name.value) >= 0) {
                    continue;
                }
                const field = model.fields.find(x => x.name === selection.name.value);
                updateArgs.select[field.info.accessorName] = true;
            }

            const result = await adurc.client[model.info.accessorName].updateMany(updateArgs);

            if (result.returning.length > 0) {
                const raItem: Record<string, unknown> = {};
                for (const adurcField in result.returning[0]) {
                    const field = model.fields.find(x => x.info.accessorName === adurcField);
                    raItem[field.name] = result.returning[0][adurcField];
                }
                return raItem;
            }

            return null;
        };
    }

    private static buildCreateResolver(adurc: Adurc, model: RAModel): IFieldResolver<unknown, unknown> {
        return async (_source, args, _context, info) => {
            const fieldNode: FieldNode = info.fieldNodes[0];
            this.logger.debug('[exposure-react-admin] invoked create model: ' + model.info.name, { node: fieldNode, args });

            const item: Record<string, unknown> = {};
            const createArgs: AdurcCreateArgs = {
                data: [item],
                select: {},
            };

            for (const arg in args) {
                const field = model.fields.find(x => x.name === arg);
                item[field.info.accessorName] = args[arg];
            }

            for (const selection of fieldNode.selectionSet.selections) {
                if (selection.kind !== 'Field' || ['__typename'].indexOf(selection.name.value) >= 0) {
                    continue;
                }
                const field = model.fields.find(x => x.name === selection.name.value);
                createArgs.select[field.info.accessorName] = true;
            }

            const result = await adurc.client[model.info.accessorName].createMany(createArgs);

            if (result.returning.length > 0) {
                const raItem: Record<string, unknown> = {};
                for (const adurcField in result.returning[0]) {
                    const field = model.fields.find(x => x.info.accessorName === adurcField);
                    raItem[field.name] = result.returning[0][adurcField];
                }
                return raItem;
            }

            return null;
        };
    }

    private static buildFilter(model: RAModel, filter: Record<string, unknown>, where: AdurcModelWhere<AdurcModelUntyped>): void {
        for (const fieldName in filter) {
            const value = filter[fieldName];
            if (fieldName === 'ids') {
                if (!(value instanceof Array)) throw new Error('Expected array on filter type ids');
                if (model.deserializeId) {
                    where.AND = [];
                    for (const v of value) {
                        const pksValue = model.deserializeId(v);
                        where.AND.push(pksValue);
                    }
                } else {
                    where['id'] = {
                        in: value
                    };
                }
                continue;
            }
            const field = model.fields.find(x => x.name === fieldName);
            where[field.info.accessorName] = value;
        }
    }

    private static buildFindMetaResolver(adurc: Adurc, model: RAModel): IFieldResolver<unknown, unknown> {
        return async (_source, args, _context, info) => {
            const fieldNode: FieldNode = info.fieldNodes[0];
            this.logger.debug('[exposure-react-admin] invoked aggregate model: ' + model.info.name, { node: fieldNode, args });

            const aggregateArgs: AdurcAggregateArgs = {
                count: true
            };

            if ('filter' in args) {
                aggregateArgs.where = {};
                this.buildFilter(model, args.filter, aggregateArgs.where);
            }

            if ('page' in args && 'perPage' in args) {
                aggregateArgs.skip = (args.perPage as number) * (args.page as number);
                aggregateArgs.take = args.perPage as number;
            }

            if ('sortField' in args && 'sortOrder' in args) {
                const field = model.fields.find(x => x.name === args.sortField);
                aggregateArgs.orderBy = { [field.info.accessorName]: args.sortOrder === 'DESC' ? 'desc' : 'asc' };
            }

            const result = await adurc.client[model.info.accessorName].aggregate(aggregateArgs);

            return result;
        };
    }

    private static buildFindOneResolver(adurc: Adurc, model: RAModel): IFieldResolver<unknown, unknown> {
        return async (_source, args, _context, info) => {
            const fieldNode: FieldNode = info.fieldNodes[0];
            this.logger.debug('[exposure-react-admin] invoked find one model: ' + model.info.name, { node: fieldNode, args });

            const findManyArgs: AdurcFindManyArgs = {
                select: {},
            };

            for (const selection of fieldNode.selectionSet.selections) {
                if (selection.kind !== 'Field' || ['__typename'].indexOf(selection.name.value) >= 0) {
                    continue;
                }
                const field = model.fields.find(x => x.name === selection.name.value);
                findManyArgs.select[field.info.accessorName] = true;
            }

            const fieldsPk = model.deserializeId ? model.deserializeId(args.id) : { id: args.id };

            findManyArgs.where = { ...fieldsPk };

            const result = await adurc.client[model.info.accessorName].findMany(findManyArgs);

            if (result.length > 0) {
                const raItem: Record<string, unknown> = {};
                for (const adurcField in result[0]) {
                    const field = model.fields.find(x => x.info.accessorName === adurcField);
                    raItem[field.name] = result[0][adurcField];
                }
                return raItem;
            }

            return null;
        };
    }

    private static buildFindManyResolver(adurc: Adurc, model: RAModel): IFieldResolver<unknown, unknown> {
        return async (_source, args, _context, info) => {
            const fieldNode: FieldNode = info.fieldNodes[0];
            this.logger.debug('[exposure-react-admin] invoked find many model: ' + model.info.name, { node: fieldNode, args });

            const findManyArgs: AdurcFindManyArgs = {
                select: {},
            };

            for (const selection of fieldNode.selectionSet.selections) {
                if (selection.kind !== 'Field' || ['__typename'].indexOf(selection.name.value) >= 0) {
                    continue;
                }
                const field = model.fields.find(x => x.name === selection.name.value);
                findManyArgs.select[field.info.accessorName] = true;
            }

            if ('filter' in args) {
                findManyArgs.where = {};
                this.buildFilter(model, args.filter, findManyArgs.where);
            }

            if ('page' in args && 'perPage' in args) {
                findManyArgs.skip = (args.perPage as number) * (args.page as number);
                findManyArgs.take = args.perPage as number;
            }

            if ('sortField' in args && 'sortOrder' in args) {
                const field = model.fields.find(x => x.name === args.sortField);
                findManyArgs.orderBy = { [field.info.accessorName]: args.sortOrder === 'DESC' ? 'desc' : 'asc' };
            }

            const result = await adurc.client[model.info.accessorName].findMany(findManyArgs);

            const output: Record<string, unknown>[] = [];

            for (const adurcItem of result) {
                const raItem: Record<string, unknown> = {};
                for (const adurcField in adurcItem) {
                    const field = model.fields.find(x => x.info.accessorName === adurcField);
                    raItem[field.name] = adurcItem[adurcField];
                }
                output.push(raItem);
            }

            return output;
        };
    }
}