import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { RAModel } from '../../src/interfaces';

const adurcFakeModel: AdurcModel = {
    name: 'fake',
    directives: [],
    fields: [
        {
            name: 'fakeOneId',
            type: 'int',
            collection: false,
            nonNull: true,
            directives: [{ name: 'pk', args: {} }],
        },
        {
            name: 'fakeSecondId',
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
        name: 'fake_one_id',
        info: adurcFakeModel.fields.find(x => x.name === 'fakeOneId'),
    },
    {
        isComputed: false,
        isPk: true,
        name: 'fake_second_id',
        info: adurcFakeModel.fields.find(x => x.name === 'fakeSecondId'),
    },
];

export const ModelMultiplePK: RAModel = {
    typeName: 'Fake',
    pluralTypeName: 'Fakes',
    pkFields: fakeModelFields.filter(x => x.isPk),
    fields: fakeModelFields,
    info: adurcFakeModel,
    serializeId: (item: Record<string, unknown>) => Buffer.from(item['fakeOneId'].toString() + '#' + item['fakeSecondId'].toString()).toString('base64'),
    deserializeId: (value: number | string) => {
        const data = Buffer.from(value.toString(), 'base64').toString('utf8').split('#');
        return ({ fakeOneId: parseInt(data[0]), fakeSecondId: parseInt(data[1]) });
    },
};