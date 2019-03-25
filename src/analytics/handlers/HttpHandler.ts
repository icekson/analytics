import {IAnalyticsHandler} from "./IAnalyticsHandler";
import {Application} from "express";

export class HttpHandler implements IAnalyticsHandler {

    constructor(private app: Application) {}

    public handle() {
        this.app.use(() => {});
        //@TODO: Add HTTP handle logic
    }
}