import {RateLimiterMemory} from "rate-limiter-flexible";
import errors from 'http-status-codes';
import {Request, Response, NextFunction} from 'express';

const RATE_LIMIT_POINTS = 200;

const rateLimiter = new RateLimiterMemory({
    points: RATE_LIMIT_POINTS,
    duration: 1,
    keyPrefix: 'middleware',
});

export function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
    rateLimiter.consume(req.ip)
        .then((rate) => {
            res.header('X-RateLimit-Limit', RATE_LIMIT_POINTS.toString());
            res.header('X-RateLimit-Remaining', rate.remainingPoints.toString());
            res.header('X-RateLimit-Reset', Math.ceil(rate.msBeforeNext / 1000).toString())
            next();
        })
        .catch(() => {
            res.status(errors.TOO_MANY_REQUESTS);
        });
}
