import { UserId } from 'drumline-lib';
import { Express, NextFunction, Request, Response } from 'express';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';

export { LoginManager };

class LoginManager {
    constructor(app: Express) {
        app.post('/login', this.login);
        app.post('/logout', this.logout);

        app.use(this.validate_private_uuid_cookie);
    }

    login = async (req: Request, res: Response) => {
        console.log(`login`);
        if (req.session === undefined || req.session === null) {
            res.status(500).send({ result: 'ERROR', message: 'session not found' });
            return;
        }
        const session: CookieSessionInterfaces.CookieSessionObject = req.session;
        if (session.hasOwnProperty('private_uuid')) {
            // our middleware should already have validated private_uuid
            res.status(200).send({ result: 'OK', message: 'already logged in' });
        }
        // create a new user_id.  the private_uuid was submitted as a form parameter
        const private_uuid = req.body.private_uuid || '';
        const user_id = this.try_create_user_id(private_uuid);
        if (!user_id) {
            res.status(400).send({ result: 'ERROR', message: 'invalid private_uuid' });
            return;
        }
        // store the user_id in the session
        session.private_uuid = private_uuid;

        res.status(200).send({ result: 'OK' });
    };

    logout = async (req: Request, res: Response) => {
        console.log(`logout`);
        if (req.session === undefined || req.session === null) {
            res.status(500).send({ result: 'ERROR', message: 'session not found' });
            return;
        }

        const session: CookieSessionInterfaces.CookieSessionObject = req.session;
        session.private_uuid = undefined;

        res.status(200).send({ result: 'OK' });
    };

    try_create_user_id = (uuid: string): UserId | null => {
        // make sure uuid is valid and a v5 uuid
        if (!uuid || !uuidValidate(uuid) || uuidVersion(uuid) !== 4) {
            return null;
        }
        try {
            // create a UserId if we can
            return new UserId(uuid);
        } catch {
            return null;
        }
    };

    validate_private_uuid_cookie = (req: Request, _res: Response, next: NextFunction) => {
        console.log(`validate_private_uuid_cookie: ${req.cookies}`);

        if (req.session !== undefined && req.session !== null) {
            // validate private_uuid, if it exists
            const session: CookieSessionInterfaces.CookieSessionObject = req.session;
            if (session.hasOwnProperty('private_uuid')) {
                const user_id = this.try_create_user_id(session.private_uuid);
                if (null !== user_id) {
                    session.private_uuid = user_id.private_uuid;
                } else {
                    // invalid private_uuid, clear it
                    session.private_uuid = undefined;
                }
            }
        }
        next();
    };

    get_private_uuid_maybe = (req: Request): string | null => {
        if (req.session === undefined || req.session === null) {
            return null;
        }

        const session: CookieSessionInterfaces.CookieSessionObject = req.session;
        return session.private_uuid || null;
    };

    get_private_uuid_fo_sho = (req: Request): string => {
        if (req.session === undefined || req.session === null) {
            throw new Error('session not found');
        }

        const session: CookieSessionInterfaces.CookieSessionObject = req.session;
        const result = session.private_uuid || null;
        if (null === result) {
            throw new Error('private_uuid not found');
        }
        return result;
    };

    is_logged_in = (req: Request): boolean => {
        return this.get_private_uuid_maybe(req) !== null;
    };
}
