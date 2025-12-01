import fs from "node:fs";
import winston from "winston";

const date = new Date().toISOString().slice(0, 10);

if (!fs.existsSync("log")) {
    fs.mkdirSync("log", { recursive: true });
}

export const logger = winston.createLogger({
    transports: [
        new winston.transports.Console({
            level: "info",
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.printf(info => {
                    let log = `${[info.timestamp]} ${info.level} : ${info.message}`;

                    if (info.error instanceof Error) {
                        log += `\n${info.error.stack}`;
                    }

                    return log;
                })
            ),
        }),

        new winston.transports.File({
            level: "info",
            filename: `log/${date}.log`,
            format: winston.format.combine(
                winston.format.errors({ stack: true }),
                winston.format.timestamp(),
                winston.format.json(),
                winston.format.prettyPrint()
            ),
        }),
    ],
});
