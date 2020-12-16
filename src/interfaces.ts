import { AdurcField, AdurcModel } from '@adurc/core/dist/interfaces/model';

export type TFieldComputed = (item: Record<string, unknown>) => string | number;

export interface RAField {
    name: string;
    info: AdurcField;
    manyFieldName?: string;
    isComputed: boolean;
    isPk: boolean;
}

export interface RAModel {
    info: AdurcModel;
    typeName: string;
    pluralTypeName: string;
    fields: RAField[];
    pkFields: RAField[];
    serializeId?: TFieldComputed;
}