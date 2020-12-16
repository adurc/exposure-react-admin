import { ValueNode } from 'graphql';

export class GraphQLValue {

    public static parse(value: ValueNode, variables: Record<string, string>): unknown {
        if (value.kind === 'Variable') {
            return variables ? variables[value.name.value] : null;
        } else if (value.kind === 'NullValue') {
            return null;
        } else if (value.kind === 'ListValue') {
            const output: unknown[] = [];
            for (const item of value.values) {
                output.push(this.parse(item, variables));
            }
            return output;
        } else if (value.kind === 'IntValue') {
            return parseInt(value.value, 10);
        } else if (value.kind === 'BooleanValue') {
            return value.value;
        } else if (value.kind === 'FloatValue') {
            return parseFloat(value.value);
        } else if (value.kind === 'StringValue') {
            return value.value;
        } else if (value.kind === 'ObjectValue') {
            const output: Record<string, unknown> = {};
            for (const field of value.fields) {
                output[field.name.value] = this.parse(field.value, variables);
            }
            return output;
        } else if (value.kind === 'EnumValue') {
            return value.value;
        } else {
            throw new Error('not implemented');
        }
    }

}