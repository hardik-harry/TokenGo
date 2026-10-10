import json
import re

# Old dictionaries
English = {
    "myProfile": "My Profile",
    "manageAccount": "Manage your account and personal information",
    "editProfile": "Edit Profile",
    "fullName": "Full Name",
    "emailAddress": "Email Address",
    "mobileNumber": "Mobile Number",
    "accountType": "Account Type",
    "memberSince": "Member Since",
    "notProvided": "Not provided",
    "readOnly": "Read-only",
    "save": "Save",
    "saving": "Saving...",
    "cancel": "Cancel",
    "accountSettings": "Account Settings",
    "notifications": "Notifications",
    "notificationsOn": "Notifications Enabled",
    "notificationsOff": "Notifications Disabled",
    "changePassword": "Change Password",
    "language": "Language",
    "theme": "Theme",
    "light": "Light",
    "dark": "Dark",
    "currentPassword": "Current Password",
    "newPassword": "New Password",
    "confirmNewPassword": "Confirm New Password",
    "updatePassword": "Update Password",
    "verifying": "Verifying...",
    "myQueueActivity": "My Queue Activity",
    "viewTokenHistory": "View Token History →",
    "pending": "Pending",
    "inProgress": "In Progress / Active",
    "completed": "Completed",
    "currentToken": "Current Token",
    "avgWaitTime": "Avg Wait Time",
    "tokenHistory": "Token History",
    "noTokensFound": "No tokens found in your history.",
    "tokenNumber": "Token Number",
    "office": "Office",
    "serviceTime": "Service Time",
    "status": "Status",
    "signOut": "Sign Out",
    "passwordChangedSuccess": "Password changed successfully!",
    "allFieldsRequired": "All fields are required.",
    "passwordsDoNotMatch": "New passwords do not match.",
    "passwordRequirements": "Password must have at least 8 chars, 1 uppercase, 1 lowercase, 1 number & 1 special symbol.",
    "settingsSaved": "Settings saved successfully."
}

Gujarati = {
    "myProfile": "મારી પ્રોફાઇલ",
    "manageAccount": "તમારું એકાઉન્ટ અને વ્યક્તિગત માહિતી મેનેજ કરો",
    "editProfile": "પ્રોફાઇલ સંપાદિત કરો",
    "fullName": "પૂરું નામ",
    "emailAddress": "ઇમેઇલ સરનામું",
    "mobileNumber": "મોબાઇલ નંબર",
    "accountType": "ખાતાનો પ્રકાર",
    "memberSince": "સભ્ય બન્યા તારીખ",
    "notProvided": "આપેલ નથી",
    "readOnly": "માત્ર વાંચવા માટે",
    "save": "સાચવો",
    "saving": "સાચવી રહ્યું છે...",
    "cancel": "રદ કરો",
    "accountSettings": "ખાતા સેટિંગ્સ",
    "notifications": "સૂચનાઓ",
    "notificationsOn": "સૂચનાઓ સક્રિય",
    "notificationsOff": "સૂચનાઓ બંધ",
    "changePassword": "પાસવર્ડ બદલો",
    "language": "ભાષા",
    "theme": "થીમ",
    "light": "લાઇટ",
    "dark": "ડાર્ક",
    "currentPassword": "વર્તમાન પાસવર્ડ",
    "newPassword": "નવો પાસવર્ડ",
    "confirmNewPassword": "નવા પાસવર્ડની પુષ્ટિ કરો",
    "updatePassword": "પાસવર્ડ અપડેટ કરો",
    "verifying": "ચકાસી રહ્યું છે...",
    "myQueueActivity": "મારી કતાર પ્રવૃત્તિ",
    "viewTokenHistory": "ટોકન ઇતિહાસ જુઓ →",
    "pending": "બાકી",
    "inProgress": "ચાલુ / સક્રિય",
    "completed": "પૂર્ણ",
    "currentToken": "વર્તમાન ટોકન",
    "avgWaitTime": "સરેરાશ પ્રતીક્ષા સમય",
    "tokenHistory": "ટોકન ઇતિહાસ",
    "noTokensFound": "તમારા ઇતિહાસમાં કોઈ ટોકન મળ્યા નથી.",
    "tokenNumber": "ટોકન નંબર",
    "office": "કચેરી",
    "serviceTime": "સેવા સમય",
    "status": "સ્થિતિ",
    "signOut": "સાઇન આઉટ",
    "passwordChangedSuccess": "પાસવર્ડ સફળતાપૂર્વક બદલાઈ ગયો!",
    "allFieldsRequired": "બધા ફીલ્ડ આવશ્યક છે.",
    "passwordsDoNotMatch": "નવા પાસવર્ડ મેળ ખાતા નથી.",
    "passwordRequirements": "પાસવર્ડમાં ઓછામાં ઓછા 8 અક્ષરો, 1 મોટો અક્ષર, 1 નાનો અક્ષર, 1 નંબર અને 1 વિશિષ્ટ ચિહ્ન હોવું જોઈએ.",
    "settingsSaved": "સેટિંગ્સ સફળતાપૂર્વક સાચવવામાં આવ્યા."
}

def merge_json(filepath, dict_to_merge):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    data.update(dict_to_merge)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

merge_json(r'c:\Users\HARDIK DABHI\OneDrive\Desktop\hackathon\project\QueueLess\frontend\src\locales\en.json', English)
merge_json(r'c:\Users\HARDIK DABHI\OneDrive\Desktop\hackathon\project\QueueLess\frontend\src\locales\gu.json', Gujarati)

