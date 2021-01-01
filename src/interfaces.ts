import { AdurcField, AdurcModel } from '@adurc/core/dist/interfaces/model';


export interface RAField {
    name: string;
    info: AdurcField;
    manyFieldName?: string;
    hasDefault: boolean;
    isPk: boolean;
}

export interface RAModel {
    info: AdurcModel;
    typeName: string;
    pluralTypeName: string;
    fields: RAField[];
    pkFields: RAField[];
    adurcClientFieldName: string;
    serializeId?: (item: Record<string, unknown>) => string | number;
    deserializeId?: (value: string | number) => Record<string, unknown>;
}