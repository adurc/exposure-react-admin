import { GraphQLScalarType, Kind } from 'graphql';

export class BufferGraphQLScalarType extends GraphQLScalarType {
    constructor() {
        super({
            name: 'Buffer',
            serialize(value: Buffer) {
                if (!(value instanceof Buffer)) {
                    throw new Error('Expected instanceof Buffer');
                }
                return value.toString('base64');
            },
            parseValue(value: string) {
                return Buffer.from(value, 'base64');
            },
            parseLiteral(ast) {
                if (ast.kind === Kind.STRING) {
                    return Buffer.from(ast.value, 'base64');
                }
                return null;
            }
        });
    }
}