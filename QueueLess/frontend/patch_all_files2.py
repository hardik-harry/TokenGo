import os
import re
import json

base_path = r"c:\Users\HARDIK DABHI\OneDrive\Desktop\hackathon\project\QueueLess\frontend\src"

def process_single(filepath, mappings, key_prefix):
    if not os.path.exists(filepath):
        return {}
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    en_dict = {}
    gu_dict = {}
    
    i = 0
    for en_str, gu_str in mappings.items():
        if en_str in content:
            key = f"{key_prefix}_{i}"
            content = content.replace(en_str, f"{{t('{key}')}}")
            en_dict[key] = en_str
            gu_dict[key] = gu_str
            i += 1
            
    if content != original:
        if "react-i18next" not in content and "const { t } = useSettings()" not in content:
            if "import { useTranslation }" not in content:
                content = "import { useTranslation } from 'react-i18next';\n" + content
            if "const { t } = useTranslation();" not in content:
                content = re.sub(r'(const \w+(?: \= \(\)| \= \(\{.*\}\)|) \=\> \{)', r'\1\n  const { t } = useTranslation();', content, 1)
                content = re.sub(r'(function \w+\(.*\) \{)', r'\1\n  const { t } = useTranslation();', content, 1)
                
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched {filepath}")
        
    return en_dict, gu_dict

all_en = {}
all_gu = {}

def apply_and_merge(filepath, maps, pre):
    e, g = process_single(filepath, maps, pre)
    all_en.update(e); all_gu.update(g)

# Contact.jsx
apply_and_merge(os.path.join(base_path, "pages", "Contact.jsx"), {
    ">Contact Us<": ">અમારો સંપર્ક કરો<",
    ">We're here to help and answer any question you might have.<": ">અમે મદદ કરવા અને તમારા કોઈપણ પ્રશ્નનો ઉકેલ લાવવા માટે અહીં છીએ.<",
    ">Send Message<": ">સંદેશો મોકલો<",
    ">Full Name<": ">પૂરું નામ<",
    ">Email Address<": ">ઇમેઇલ સરનામું<",
    ">Message<": ">સંદેશો<"
}, "contact")

# TrackRedirect.jsx
apply_and_merge(os.path.join(base_path, "pages", "TrackRedirect.jsx"), {
    ">Track Your Token<": ">તમારું ટોકન ટ્રૅક કરો<",
    ">Enter your 6-character token reference ID to view its live status and estimated wait time.<": ">લાઇવ સ્થિતિ અને પ્રતીક્ષા સમય જોવા માટે તમારો 6 અક્ષરનો ટોકન સંદર્ભ નંબર દાખલ કરો.<",
    ">Token Reference ID<": ">ટોકન સંદર્ભ નંબર<",
    ">e.g. A3F9B2<": ">ઉદા. A3F9B2<",
    ">Track Token<": ">ટોકન ટ્રૅક કરો<"
}, "track_red")

# TokenVerify.jsx
apply_and_merge(os.path.join(base_path, "pages", "TokenVerify.jsx"), {
    ">Official Token Verification<": ">અધિકૃત ટોકન ચકાસણી<",
    ">Authentic Token<": ">અસલ ટોકન<",
    ">Invalid or Expired Token<": ">અમાન્ય અથવા નિવૃત્ત ટોકન<"
}, "verif")


def update_locales():
    def merge(filepath, d):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        data.update(d)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
    merge(os.path.join(base_path, "locales", "en.json"), all_en)
    merge(os.path.join(base_path, "locales", "gu.json"), all_gu)

update_locales()
