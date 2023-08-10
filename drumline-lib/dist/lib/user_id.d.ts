export { UserId };
declare class UserId {
    readonly private_uuid: string;
    readonly public_uuid: string;
    constructor(private_uuid: string | null);
}
