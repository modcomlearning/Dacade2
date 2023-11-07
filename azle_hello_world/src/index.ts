import {
  $query,
  $update,
  Record,
  StableBTreeMap,
  Vec,
  match,
  Result,
  nat64,
  ic,
  Opt,
} from "azle";
import { v4 as uuidv4 } from "uuid";

// Define the Message record type
type Message = Record<{
  id: string;
  title: string;
  body: string;
  attachmentURL: string;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;

// Define the MessagePayload type for payload validation
type MessagePayload = Record<{
  title: string;
  body: string;
  attachmentURL: string;
}>;

// Create storage for messages
const messagesStorage = new StableBTreeMap<string, Message>(0, 44, 1024);

$update;
/**
 * Adds a new message.
 *
 * @param payload - The message payload.
 * @returns A Result with the added message or an error message.
 */
export function addMessage(payload: MessagePayload): Result<Message, string> {
  // Payload Validation: Ensure that title, body, and attachmentURL are present in the payload
  if (!payload.title || !payload.body || !payload.attachmentURL) {
    return Result.Err("Missing required fields in the payload.");
  }

  // Create a new message record
  const message: Message = {
    id: uuidv4(),
    createdAt: ic.time(),
    updatedAt: Opt.None,
    title: payload.title, // Explicit Property Setting
    body: payload.body, // Explicit Property Setting
    attachmentURL: payload.attachmentURL, // Explicit Property Setting
  };

  try {
    messagesStorage.insert(message.id, message); // Error Handling: Handle any errors during insertion
  } catch (error) {
    return Result.Err(`Failed to add the message: ${error}`);
  }

  return Result.Ok<Message, string>(message);
}

$query;
/**
 * Gets all messages.
 *
 * @returns A Result with a vector of messages or an error message.
 */
export function getMessages(): Result<Vec<Message>, string> {
  return Result.Ok(messagesStorage.values());
}

$query;
/**
 * Gets a message by ID.
 *
 * @param id - The ID of the message.
 * @returns A Result with the message or an error message if not found.
 */
export function getMessage(id: string): Result<Message, string> {
  return match(messagesStorage.get(id), {
    Some: (message) => Result.Ok<Message, string>(message),
    None: () => Result.Err<Message, string>(`Message with ID=${id} not found.`),
  });
}

$update;
/**
 * Updates a message.
 *
 * @param id - The ID of the message to update.
 * @param payload - The updated message payload.
 * @returns A Result with the updated message or an error message if not found.
 */
export function updateMessage(id: string, payload: MessagePayload): Result<Message, string> {
  return match(messagesStorage.get(id), {
    Some: (message) => {
      const updatedMessage: Message = {
        ...message,
        ...payload,
        updatedAt: Opt.Some(ic.time()),
      };

      try {
        messagesStorage.insert(updatedMessage.id, updatedMessage); // Error Handling: Handle any errors during insertion
      } catch (error) {
        return Result.Err<Message, string>(`Failed to update the message: ${error}`);
      }

      return Result.Ok<Message, string>(updatedMessage);
    },
    None: () => Result.Err<Message, string>(`Message with ID=${id} not found.`),
  });
}

$update;
/**
 * Deletes a message.
 *
 * @param id - The ID of the message to delete.
 * @returns A Result with the deleted message or an error message if not found.
 */
export function deleteMessage(id: string): Result<Message, string> {
  const deletedMessage = messagesStorage.remove(id);
  return match(deletedMessage, {
    Some: (message) => Result.Ok<Message, string>(message),
    None: () => Result.Err<Message, string>(`Couldn't delete a message with ID=${id}. Message not found` ),
  });
}

globalThis.crypto = {
  //@ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32);

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }

    return array;
  },
};
