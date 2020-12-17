import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { RAModel } from '../../src/interfaces';

const adurcFakeModel: AdurcModel = {
    name: 'fake',
    directives: [],
    fields: [
        {
            name: 'id',
            type: 'int',
            collection: false,
            nonNull: true,
            directives: [{ name: 'pk', args: {} }],
        },
        {
            name: 'name',
            type: 'string',
            collection: false,
            nonNull: true,
            directives: [],
        }
    ],
};

const fakeModelFields = [
    {
        isComputed: false,
        isPk: true,
        name: 'id',
        info: adurcFakeModel.fields.find(x => x.name === 'id'),
    },
    {
        isComputed: false,
        isPk: false,
        name: 'name',
        info: adurcFakeModel.fields.find(x => x.name === 'name'),
    },
];

export const ModelSimple: RAModel = {
    typeName: 'Fake',
    pluralTypeName: 'Fakes',
    pkFields: fakeModelFields.filter(x => x.isPk),
    fields: fakeModelFields,
    info: adurcFakeModel,
};