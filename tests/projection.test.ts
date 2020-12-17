/* eslint-disable camelcase */

import { gql } from 'apollo-server-express';
import { FieldNode, OperationDefinitionNode } from 'graphql';
import { ProjectionParser } from '../src/projection.parser';
import { ModelNonIdField } from './mocks/model-id-with-different-name';
import { ModelMultiplePK } from './mocks/model-multiples-pk';
import { ModelSimpleId } from './mocks/model-simple-id';


describe('projection parser', () => {

    it('filter with id', () => {
        const where = ProjectionParser.parseFilter([ModelSimpleId], ModelSimpleId, {
            id: 1
        });

        expect(where).toStrictEqual({
            id: { _eq: 1 },
        });
    });


    it('filter with id but different id field name', () => {
        const where = ProjectionParser.parseFilter([ModelNonIdField], ModelNonIdField, {
            id: 1
        });

        expect(where).toStrictEqual({
            fakeId: { _eq: 1 },
        });
    });

    it('filter with ids', () => {
        const where = ProjectionParser.parseFilter([ModelSimpleId], ModelSimpleId, {
            ids: [1, 2, 3]
        });

        expect(where).toStrictEqual({
            id: { _in: [1, 2, 3] },
        });
    });

    it('filter with id multiples pk', () => {
        const where = ProjectionParser.parseFilter([ModelMultiplePK], ModelMultiplePK, {
            id: Buffer.from('2#4').toString('base64'),
        });

        expect(where).toStrictEqual({
            fakeOneId: { _eq: 2 },
            fakeSecondId: { _eq: 4 },
        });
    });

    it('sort by field', () => {
        const query = gql`
            query allFakes{
                allFakes(sortField: "id", sortOrder: "ASC") {
                    id
                }
            }
        `;

        const fieldNode = (query.definitions[0] as OperationDefinitionNode).selectionSet.selections[0] as FieldNode;

        const projection = ProjectionParser.parseField([ModelSimpleId], ModelSimpleId, 'Fake', fieldNode, {});

        expect(projection).toStrictEqual({
            type: 'expand',
            name: 'Fake',
            args: {
                order_by: { id: 'asc' }
            }, fields: [
                { type: 'field', name: 'id' }
            ],
        });
    });
});