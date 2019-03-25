export interface LogEvent {
    event: string;
    type: string;
    time: number;
    visitorId: string;
    sessionId: string;
    ip: string;
    country: string;
    device: string;
    os: string;
    browser: string;
    data?: string,
    hash?: string
}