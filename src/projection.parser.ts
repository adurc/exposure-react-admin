import { AdurcObject, AdurcDirectiveArgDefinition } from '@adurc/core/dist/interfaces/model';
import { ProjectionInfoMeta, ProjectionInfo } from '@adurc/core/dist/interfaces/projection';
import { SelectionNode, SelectionSetNode, FieldNode } from 'graphql';
import { GraphQLArguments } from './arguments';
import { RAModel } from './interfaces';

const META_FIELDS: string[] = ['__typename'];

export class ProjectionParser {
    static parseSet(model: RAModel, args: Record<string, unknown>): Record<string, unknown> {
        const output = {};

        for (const property in args) {
            const field = model.fields.find(x => x.name === property);
            if (field.isComputed) {
                continue;
            }
            output[field.info.name] = args[property];
        }

        return output;
    }

    public static parseSelection(models: RAModel[], model: RAModel, selection: SelectionNode, variables: Record<string, unknown>): ProjectionInfoMeta {
        if (selection.kind === 'Field') {
            const field = model.fields.find(x => x.name === selection.name.value || x.manyFieldName === selection.name.value);
            if (!selection.selectionSet) {
                return { type: 'field', name: field.info.name };
            } else {
                const relationModel = models.find(x => x.info.name === field.info.type);
                return this.parseField(models, relationModel, field.info.name, selection, variables);
            }
        } else {
            throw new Error(`Not implemented ${selection.kind}`);
        }
    }

    public static parseSelectionSet(models: RAModel[], model: RAModel, selectionSet: SelectionSetNode, variables: Record<string, unknown>): ProjectionInfoMeta[] {
        const output: ProjectionInfoMeta[] = [];

        for (const selection of selectionSet.selections) {
            if (selection.kind === 'Field' && (META_FIELDS.indexOf(selection.name.value) >= 0)) {
                continue;
            }

            if (selection.kind === 'Field' && selection.name.value === 'id' && model.serializeId) {
                model.pkFields.forEach(x => output.push({
                    type: 'field',
                    name: x.info.name,
                }));
                continue;
            }

            output.push(this.parseSelection(models, model, selection, variables));
        }

        return output;
    }

    public static parseField(models: RAModel[], model: RAModel, fieldName: string, field: FieldNode, variables: Record<string, unknown>): ProjectionInfo {
        const args: Record<string, unknown> = {};

        if (typeof variables.sortField === 'string' && typeof variables.sortOrder === 'string') {
            args['order_by'] = { [variables.sortField]: variables.sortOrder === 'DESC' ? 'desc' : 'asc' };
        }

        if (typeof variables.perPage === 'number') {
            args.limit = variables.perPage;
        }

        if (typeof variables.page === 'number' && typeof variables.perPage === 'number') {
            args.offset = variables.page * variables.perPage;
        }

        if (variables.filter) {
            args.where = this.parseFilter(models, model, variables.filter as Record<string, unknown>);
        }

        const output: ProjectionInfo = {
            type: 'expand',
            name: fieldName,
            args,
            fields: this.parseSelectionSet(models, model, field.selectionSet, variables),
        };

        return output;
    }

    public static parseFilter(models: RAModel[], model: RAModel, filter: Record<string, unknown>): Record<string, unknown> {
        const where: Record<string, Record<string, unknown>> = {};
        const operators = ['lt', 'lte', 'gt', 'gte'];

        for (const field of model.fields) {
            if (field.info.collection) {
                continue;
            }

            const modelType = models.find(x => x.info.name === field.info.type);
            if (modelType) {
                continue;
            }

            for (const filterKey in filter) {
                const value = filter[filterKey];

                if (filterKey === field.name) {
                    where[field.info.name] = where[field.info.name] || {};
                    where[field.info.name]._eq = value;
                    continue;
                }

                const graphqlType = this.transformDataServerTypeIntoGraphQLType(field.info.type);
                const hasOperators = graphqlType === 'Int';

                if (hasOperators) {
                    for (const operator of operators) {
                        if (filterKey === `${field.name}_${operator}`) {
                            where[field.info.name] = where[field.info.name] || {};
                            where[field.info.name][`_${operator}`] = value;
                            break;
                        }
                    }
                }
            }

        }

        return where;
    }


    public static parseAggregateFieldAggregate(model: RAModel, field: FieldNode): ProjectionInfoMeta {
        if (field.name.value !== 'aggregate') {
            throw new Error();
        }

        if (!field.selectionSet) {
            throw new Error();
        }

        const output: ProjectionInfo = {
            type: 'expand',
            name: 'aggregate',
            fields: field.selectionSet.selections.map<ProjectionInfoMeta>(x => {
                if (x.kind !== 'Field') {
                    throw new Error();
                }
                if (x.name.value === 'count') {
                    return {
                        type: 'field',
                        name: 'count',
                    };
                }
                return {
                    type: 'expand',
                    name: x.name.value, // aggregator 
                    fields: x.selectionSet.selections.map<ProjectionInfoMeta>(y => {
                        if (y.kind !== 'Field') {
                            throw new Error();
                        }
                        const field = model.fields.find(c => c.name === y.name.value);
                        return {
                            type: 'field',
                            name: field.info.name,
                        };
                    }),
                };
            }),
        };

        return output;
    }

    public static parseAggregateSelectionSet(model: RAModel, selectionSet: SelectionSetNode): ProjectionInfoMeta[] {
        const output: ProjectionInfoMeta[] = [];

        for (const selection of selectionSet.selections) {
            if (selection.kind !== 'Field') {
                throw new Error();
            }

            switch (selection.name.value) {
                case 'aggregate':
                    output.push(this.parseAggregateFieldAggregate(model, selection));
                    break;
                default:
                    throw new Error();
            }
        }

        return output;
    }

    public static parseAggregateField(models: ReadonlyArray<RAModel>, model: RAModel, field: FieldNode): ProjectionInfo {
        const output: ProjectionInfo = {
            type: 'expand',
            name: model.info.name,
            args: GraphQLArguments.parse(field.arguments, null),
            fields: this.parseAggregateSelectionSet(model, field.selectionSet),
        };

        return output;
    }

    public static transformDataServerTypeIntoGraphQLType(valueType: string | AdurcObject<AdurcDirectiveArgDefinition>): string {
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