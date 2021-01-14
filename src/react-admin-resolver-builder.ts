import { IFieldResolver, IResolvers } from 'graphql-tools';
import { RAModel } from './interfaces';
import { AdurcFindManyArgs } from '@adurc/core/dist/interfaces/client/find-many.args';
import { FieldNode } from 'graphql';
import { AdurcAggregateArgs } from '@adurc/core/dist/interfaces/client/aggregate.args';
import { AdurcCreateArgs } from '@adurc/core/dist/interfaces/client/create.args';
import { AdurcUpdateArgs } from '@adurc/core/dist/interfaces/client/update.args';
import { AdurcDeleteArgs } from '@adurc/core/dist/interfaces/client/delete.args';
import { AdurcModelWhere, AdurcModelWhereUntyped } from '@adurc/core/dist/interfaces/client/where';
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

            const deleteArgs: AdurcDeleteArgs = {
                select: {},
                where: {},
            };

            const fieldsPk = model.deserializeId ? model.deserializeId(args.id) : { id: args.id };
            deleteArgs.where = { ...fieldsPk };

            let selectedPkComputed = false;
            for (const selection of fieldNode.selectionSet.selections) {
                if (selection.kind !== 'Field' || ['__typename'].indexOf(selection.name.value) >= 0) {
                    continue;
                }
                if (selection.name.value === 'id' && model.deserializeId) {
                    selectedPkComputed = true;
                    for (const pk of model.pkFields) {
                        deleteArgs.select[pk.info.accessorName] = true;
                    }
                    continue;
                }
                const field = model.fields.find(x => x.name === selection.name.value);
                deleteArgs.select[field.info.accessorName] = true;
            }

            const result = await adurc.client[model.info.accessorName].deleteMany(deleteArgs);

            if (result.returning.length > 0) {
                const raItem: Record<string, unknown> = {};
                const deletedItem = result.returning[0];

                if (selectedPkComputed) {
                    raItem.id = model.serializeId(deletedItem);
                }

                for (const adurcField in deletedItem) {
                    const field = model.fields.find(x => x.info.accessorName === adurcField);
                    raItem[field.name] = deletedItem[adurcField];
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
                if (arg === 'id' || arg in fieldsPk) continue;
                const field = model.fields.find(x => x.name === arg);
                item[field.info.accessorName] = args[arg];
            }

            let selectedPkComputed = false;
            for (const selection of fieldNode.selectionSet.selections) {
                if (selection.kind !== 'Field' || ['__typename'].indexOf(selection.name.value) >= 0) {
                    continue;
                }
                if (selection.name.value === 'id' && model.deserializeId) {
                    selectedPkComputed = true;
                    for (const pk of model.pkFields) {
                        updateArgs.select[pk.info.accessorName] = true;
                    }
                    continue;
                }
                const field = model.fields.find(x => x.name === selection.name.value);
                updateArgs.select[field.info.accessorName] = true;
            }

            const result = await adurc.client[model.info.accessorName].updateMany(updateArgs);

            if (result.returning.length > 0) {
                const raItem: Record<string, unknown> = {};
                const updatedElement = result.returning[0];

                if (selectedPkComputed) {
                    raItem.id = model.serializeId(updatedElement);
                }

                for (const adurcField in updatedElement) {
                    const field = model.fields.find(x => x.info.accessorName === adurcField);
                    raItem[field.name] = updatedElement[adurcField];
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
                if (arg === 'id' && model.deserializeId) {
                    const pkFields = model.deserializeId(args.id);
                    for (const pk in pkFields) {
                        item[pk] = pkFields[pk];
                    }
                    continue;
                }
                const field = model.fields.find(x => x.name === arg);
                item[field.info.accessorName] = args[arg];
            }

            let selectedPkComputed = false;
            for (const selection of fieldNode.selectionSet.selections) {
                if (selection.kind !== 'Field' || ['__typename'].indexOf(selection.name.value) >= 0) {
                    continue;
                }
                if (selection.name.value === 'id' && model.deserializeId) {
                    selectedPkComputed = true;
                    for (const pk of model.pkFields) {
                        createArgs.select[pk.info.accessorName] = true;
                    }
                    continue;
                }
                const field = model.fields.find(x => x.name === selection.name.value);
                createArgs.select[field.info.accessorName] = true;
            }

            const result = await adurc.client[model.info.accessorName].createMany(createArgs);

            if (result.returning.length > 0) {
                const raItem: Record<string, unknown> = {};
                const createdItem = result.returning[0];

                if (selectedPkComputed) {
                    raItem.id = model.serializeId(createdItem);
                }

                for (const adurcField in createdItem) {
                    const field = model.fields.find(x => x.info.accessorName === adurcField);
                    raItem[field.name] = createdItem[adurcField];
                }

                return raItem;
            }

            return null;
        };
    }

    private static buildFilter(model: RAModel, filter: Record<string, unknown>, where: AdurcModelWhere<AdurcModelUntyped>): void {
        where.AND = [];
        for (const fieldName in filter) {
            const value = filter[fieldName];
            if (fieldName === 'q') {
                if (model.queryFields.length === 0) {
                    throw new Error(`Model ${model.info.name} can't be filtered by 'q' why it haven't some directive query.`);
                }

                const filter: AdurcModelWhereUntyped = { OR: [] as never };
                where.AND.push(filter);

                for (const queryField of model.queryFields) {
                    filter.OR.push({
                        [queryField.info.accessorName]: {
                            contains: value as string,
                        },
                    });
                }

                continue;
            } else if (fieldName === 'ids') {
                if (!(value instanceof Array)) throw new Error('Expected array on filter type ids');
                if (model.deserializeId) {

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
            } else if (fieldName === 'id' && model.deserializeId) {
                where.AND = [];
                const pksValue = model.deserializeId(value as string | number);
                where.AND.push(pksValue);
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
                if (args.sortField === 'id' && model.deserializeId) {
                    aggregateArgs.orderBy = {};
                    for (const pk of model.pkFields) {
                        aggregateArgs.orderBy[pk.info.accessorName] = args.sortOrder === 'DESC' ? 'desc' : 'asc';
                    }
                } else {
                    const field = model.fields.find(x => x.name === args.sortField);
                    aggregateArgs.orderBy = { [field.info.accessorName]: args.sortOrder === 'DESC' ? 'desc' : 'asc' };
                }
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

            let selectedPkComputed = false;
            for (const selection of fieldNode.selectionSet.selections) {
                if (selection.kind !== 'Field' || ['__typename'].indexOf(selection.name.value) >= 0) {
                    continue;
                }
                if (selection.name.value === 'id' && model.deserializeId) {
                    selectedPkComputed = true;
                    for (const pk of model.pkFields) {
                        findManyArgs.select[pk.info.accessorName] = true;
                    }
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
                const item = result[0];

                if (selectedPkComputed) {
                    raItem.id = model.serializeId(item);
                }

                for (const adurcField in item) {
                    const field = model.fields.find(x => x.info.accessorName === adurcField);
                    raItem[field.name] = item[adurcField];
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

            let selectedPkComputed = false;
            for (const selection of fieldNode.selectionSet.selections) {
                if (selection.kind !== 'Field' || ['__typename'].indexOf(selection.name.value) >= 0) {
                    continue;
                }

                if (selection.name.value === 'id' && model.deserializeId) {
                    selectedPkComputed = true;
                    for (const pk of model.pkFields) {
                        findManyArgs.select[pk.info.accessorName] = true;
                    }
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
                if (args.sortField === 'id' && model.deserializeId) {
                    findManyArgs.orderBy = {};
                    for (const pk of model.pkFields) {
                        findManyArgs.orderBy[pk.info.accessorName] = args.sortOrder === 'DESC' ? 'desc' : 'asc';
                    }
                } else {
                    const field = model.fields.find(x => x.name === args.sortField);
                    findManyArgs.orderBy = { [field.info.accessorName]: args.sortOrder === 'DESC' ? 'desc' : 'asc' };
                }
            }

            const result = await adurc.client[model.info.accessorName].findMany(findManyArgs);

            const output: Record<string, unknown>[] = [];

            for (const adurcItem of result) {
                const raItem: Record<string, unknown> = {};

                if (selectedPkComputed) {
                    raItem.id = model.serializeId(adurcItem);
                }

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