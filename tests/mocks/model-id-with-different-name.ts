import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { RAModel } from '../../src/interfaces';

const adurcFakeModel: AdurcModel = {
    name: 'fake',
    directives: [],
    fields: [
        {
            name: 'fakeId',
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
        name: 'fake_id',
        info: adurcFakeModel.fields.find(x => x.name === 'fakeId'),
    },
];

export const ModelNonIdField: RAModel = {
    typeName: 'Fake',
    pluralTypeName: 'Fakes',
    pkFields: fakeModelFields.filter(x => x.isPk),
    fields: fakeModelFields,
    info: adurcFakeModel,
    serializeId: (item: Record<string, unknown>) => item['fakeId'] as number,
    deserializeId: (value: number | string) => ({ fakeId: value as number }),
};