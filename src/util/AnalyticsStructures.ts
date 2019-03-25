
export interface AnalyticsDataItem {
    label: string,
    data: Array<{
        date: string,
        amount: number
    }>,
    total: number;
}

export interface AnalyticsCommonDataItem extends Array<{
    name: string,
    amount: number|string,
    category?: string
}> {}

export interface AnalyticsData {
    main: {
        visitors: AnalyticsDataItem
        configurations: AnalyticsDataItem,
        sessionDuration: AnalyticsDataItem,
        configurationsPerSession: AnalyticsDataItem,
        configurationsPerVisitor: AnalyticsDataItem,
        sessionsPerVisitor: AnalyticsDataItem,
        savedConfigurations: AnalyticsDataItem
    },
    common: {
        variants: AnalyticsCommonDataItem,
        countries: AnalyticsCommonDataItem,
        browsers: AnalyticsCommonDataItem,
        devices: AnalyticsCommonDataItem,
        os: AnalyticsCommonDataItem
    }
}