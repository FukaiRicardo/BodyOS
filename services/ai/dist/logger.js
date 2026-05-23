"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pinoHttpLogger = exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const logLevel = process.env.LOG_LEVEL || 'info';
exports.logger = (0, pino_1.default)({
    level: logLevel,
    transport: process.env.NODE_ENV === 'production'
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
                colorize: true,
                singleLine: false,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname'
            }
        }
});
exports.pinoHttpLogger = require('pino-http')({
    logger: exports.logger,
    customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500)
            return 'error';
        if (res.statusCode >= 400)
            return 'warn';
        return 'info';
    },
    customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} - ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} - ${res.statusCode} - ${err?.message}`;
    }
});
exports.default = exports.logger;
