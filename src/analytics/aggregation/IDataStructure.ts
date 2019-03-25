export interface IDataStructure {
    main: Array<{
        date: Date,
        type: string,
        partition?: string,
        visitors: number,
        sessions: number,
        configurations: number,
        avgSessionDuration: number,
        avgConfigurationsPerSession: number,
        avgConfigurationsPerVisitor: number,
        savedConfigurations: number
    }>,
    totals: {[name: string]: string},
    common: Array<{
        date: Date,
        partition?: string,
        metricName: string,
        metricValue: string;
        category: string,
        amount: number
    }>
}