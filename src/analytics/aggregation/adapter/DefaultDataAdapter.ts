import {IDataAdapter} from "./IDataAdapter";
import {IDataStructure} from "../";

export class DefaultDataAdapter implements IDataAdapter {


    async convert(data: IDataStructure|null): Promise<any> {
        return null;
    }
}