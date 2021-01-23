import { GraphQLScalarType, Kind } from 'graphql';

export class DateGraphQLScalarType extends GraphQLScalarType {
    constructor() {
        super({
            name: 'Date',
            serialize(value: Date) {
                if (!(value instanceof Date)) {
                    throw new Error('Expected instanceof Date');
                }
                return value.toISOString();
            },
            parseValue(value: string) {
                return new Date(value);
            },
            parseLiteral(ast) {
                if (ast.kind === Kind.STRING) {
                    return new Date(ast.value);
                }
                return null;
            }
        });
    }
}