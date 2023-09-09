const defaulutOutputOption = {
    year: true,
    month: true,
    date: true,
    hours: true,
    minutes: true,
    seconds: true,
};
export const formatDate = (
    ISO8601: string | undefined,
    timezone: string | undefined,
    outputOption?: Partial<typeof defaulutOutputOption>
): string | undefined => {
    const output = { ...defaulutOutputOption, ...outputOption };

    const parseOffsetTimeFromString = (
        timezone: string | undefined
    ): number => {
        if (!timezone) {
            return 0;
        }

        const plus = timezone.includes("+");
        const minus = timezone.includes("-");
        const numberonly = timezone.replace(/[\+\-]/, "");
        const splitted = numberonly.split(":").map((v) => Number.parseInt(v));

        const millisec = (splitted[0] * 60 + splitted[1]) * 60 * 1000;

        if (plus) {
            return millisec;
        }

        if (minus) {
            return -millisec;
        }

        return 0;
    };

    const zeroPadding = (num: number): string => {
        return String(num).padStart(2, "0");
    };

    if (!ISO8601) {
        return;
    }

    const dateTime = new Date(ISO8601);

    const timezoneInMillis = parseOffsetTimeFromString(timezone);

    dateTime.setTime(dateTime.getTime() + timezoneInMillis);

    const date: (number | string)[] = [];
    if (output?.year) {
        date.push(dateTime.getUTCFullYear());
    }
    if (output?.month) {
        date.push(dateTime.getUTCMonth() + 1);
    }
    if (output?.date) {
        date.push(dateTime.getUTCDate());
    }

    const dateString = date.join("/");

    const time: (number | string)[] = [];
    if (output?.hours) {
        time.push(zeroPadding(dateTime.getUTCHours()));
    }
    if (output?.minutes) {
        time.push(zeroPadding(dateTime.getUTCMinutes()));
    }
    if (output?.seconds) {
        time.push(zeroPadding(dateTime.getUTCSeconds()));
    }
    const timeString = time.join(":");

    if (dateString && timeString) {
        return `${dateString} ${timeString}`;
    } else if (dateString) {
        return dateString;
    } else if (timeString) {
        return timeString;
    } else {
        return "";
    }
};

export function formatDateRange(start_at: string, end_at?: string): string {
    const isInvalidDate = (date: Date) => Number.isNaN(date.getTime());

    const start = new Date(start_at);
    const start_str = `${start.getUTCFullYear()}/${
        start.getUTCMonth() + 1
    }/${start.getUTCDate()}`;

    if (isInvalidDate(start)) {
        return "";
    }

    if (!end_at) {
        return start_str;
    }

    const end = new Date(end_at);
    if (isInvalidDate(end)) {
        return start_str;
    }

    if (start.getUTCFullYear() === end.getUTCFullYear()) {
        if (start.getUTCMonth() === end.getUTCMonth()) {
            if (start.getUTCDay() === end.getUTCDay()) {
                return start_str;
            } else {
                return `${start_str} - ${end.getUTCDate()}`;
            }
        } else {
            return `${start_str} - ${
                end.getUTCMonth() + 1
            }/${end.getUTCDate()}`;
        }
    } else {
        const end_str = `${end.getUTCFullYear()}/${
            end.getUTCMonth() + 1
        }/${end.getUTCDate()}`;
        return `${start_str} - ${end_str}`;
    }
}
