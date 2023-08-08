import { UserId } from 'drumline-lib';
import { readable } from 'svelte/store';

export { userStore };

// our private v5 uuid for this user
const STORAGE_KEY_PRIVATE_UUID = 'drumline-uuid';

const storedPrivateUuid = window.localStorage.getItem(STORAGE_KEY_PRIVATE_UUID) ?? null;

// if we pass in null, we'll generate a new, unique, id
const user_id = new UserId(storedPrivateUuid);

// if we generated an ID, save it for later
if (null === storedPrivateUuid) {
    window.localStorage.setItem(STORAGE_KEY_PRIVATE_UUID, user_id.private_uuid);
}

const userStore = readable<UserId>(user_id);
