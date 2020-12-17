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
];

export const ModelSimpleId: RAModel = {
    typeName: 'Fake',
    pluralTypeName: 'Fakes',
    pkFields: fakeModelFields.filter(x => x.isPk),
    fields: fakeModelFields,
    info: adurcFakeModel,
};