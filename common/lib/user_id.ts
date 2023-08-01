import { v4 as uuidv4, v5 as uuidv5, validate as uuidValidate, version as uuidVersion } from 'uuid';

export { UserId };

const UUID_NAMESPACE = 'https://drumline.rudesoftware.net';

class UserId {
    readonly private_uuid: string;
    readonly public_uuid: string;

    constructor(private_uuid: string | null) {
        if (
            private_uuid &&
            private_uuid.length > 0 &&
            uuidValidate(private_uuid) &&
            uuidVersion(private_uuid) === 4
        ) {
            this.private_uuid = private_uuid;
        } else {
            // we need to generate one
            this.private_uuid = uuidv4();
        }

        // make a public UUID too
        this.public_uuid = uuidv5(uuidv5.URL + UUID_NAMESPACE, this.private_uuid);
    }
}
