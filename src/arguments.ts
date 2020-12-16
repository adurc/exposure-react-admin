import { ArgumentNode } from 'graphql';
import { GraphQLValue } from './value';

export class GraphQLArguments {

    public static parse(args: readonly ArgumentNode[], variables: Record<string, string>): Record<string, unknown> {
        const output = {};
        for (const arg of args) {
            output[arg.name.value] = GraphQLValue.parse(arg.value, variables);
        }
        return output;
    }

}