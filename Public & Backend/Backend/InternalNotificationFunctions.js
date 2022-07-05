import {notifications} from 'wix-crm-backend';

// Notifies the site owner via Dashboard and Mobile app notifications.
export function notifyOwner(title, message) {
  notifications.notify(
    message, 
    ["Dashboard", "Mobile"], 
    {
      "title": title,
      "recipients": {"role": "Owner"}
    }
  );
}
