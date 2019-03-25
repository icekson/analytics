import {IDataStructure} from "../";

export interface IDataAdapter {

    convert(data: IDataStructure| null): Promise<any>;
}