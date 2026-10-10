import os
import re
import json

base_path = r"c:\Users\HARDIK DABHI\OneDrive\Desktop\hackathon\project\QueueLess\frontend\src"

def process_single(filepath, mappings, key_prefix):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return {}
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    en_dict = {}
    gu_dict = {}
    
    # We will just sequentially replace
    i = 0
    for en_str, gu_str in mappings.items():
        if en_str in content:
            key = f"{key_prefix}_{i}"
            content = content.replace(en_str, f"{{t('{key}')}}")
            en_dict[key] = en_str
            # A simple rule: if it's already translated, use it, otherwise use gu_str
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

def update_locales(en_dict, gu_dict):
    def merge(filepath, d):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        data.update(d)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
    merge(os.path.join(base_path, "locales", "en.json"), en_dict)
    merge(os.path.join(base_path, "locales", "gu.json"), gu_dict)


all_en = {}
all_gu = {}

# Login.jsx
login_map = {
    ">Login to TokenGo<": ">TokenGo માં લૉગિન કરો<",
    ">Email Address<": ">ઇમેઇલ સરનામું<",
    ">Password<": ">પાસવર્ડ<",
    ">Logging in...<": ">લૉગિન થઈ રહ્યું છે...<",
    "Login</button>": "લૉગિન</button>",
    ">Don't have an account? <": ">શું તમારી પાસે ખાતું નથી? <",
    ">Register here<": ">અહીં નોંધણી કરો<"
}
e, g = process_single(os.path.join(base_path, "pages", "Login.jsx"), login_map, "login")
all_en.update(e); all_gu.update(g)

# Register.jsx
reg_map = {
    ">Create an Account<": ">ખાતું બનાવો<",
    ">Full Name<": ">પૂરું નામ<",
    ">Phone Number (10 digits)<": ">ફોન નંબર (10 અંકો)<",
    ">Creating Account...<": ">ખાતું બની રહ્યું છે...<",
    ">Register<": ">નોંધણી કરો<",
    ">Already have an account? <": ">શું પહેલેથી જ ખાતું છે? <",
    ">Login here<": ">અહીં લૉગિન કરો<",
    ">A secure password must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.<": ">સુરક્ષિત પાસવર્ડમાં ઓછામાં ઓછા 8 અક્ષરો, એક કેપિટલ અક્ષર, એક નાનો અક્ષર, એક નંબર અને એક વિશિષ્ટ અક્ષર હોવો જરૂરી છે.<"
}
e, g = process_single(os.path.join(base_path, "pages", "Register.jsx"), reg_map, "reg")
all_en.update(e); all_gu.update(g)

# Help.jsx
help_map = {
    ">Help Center & FAQ<": ">સહાય કેન્દ્ર અને વારંવાર પૂછાતા પ્રશ્નો<",
    ">How can we assist you today?<": ">આજે અમે તમને કેવી રીતે મદદ કરી શકીએ?<",
    ">Common Questions<": ">સામાન્ય પ્રશ્નો<",
    ">How is the wait time calculated?<": ">પ્રતીક્ષા સમયની ગણતરી કેવી રીતે થાય છે?<",
    ">Can I cancel my token?<": ">શું હું મારું ટોકન રદ કરી શકું?<",
    ">What happens if I miss my turn?<": ">જો હું મારો વારો ચૂકી જાઉં તો શું થાય?<",
    ">Need More Help?<": ">વધુ સહાયની જરૂર છે?<",
    ">If you cannot find the answer you are looking for, please reach out to our team.<": ">જો તમને તમારો જવાબ ન મળે, તો કૃપા કરીને અમારી ટીમનો સંપર્ક કરો.<",
    ">Contact Support<": ">આધાર માટે સંપર્ક કરો<"
}
e, g = process_single(os.path.join(base_path, "pages", "Help.jsx"), help_map, "help")
all_en.update(e); all_gu.update(g)

# TokenLive.jsx
token_map = {
    ">Live Token Status<": ">લાઇવ ટોકન સ્થિતિ<",
    ">Current Queue Status<": ">વર્તમાન કતાર સ્થિતિ<",
    ">People Ahead<": ">આગળના લોકો<",
    ">Est. Wait<": ">અંદાજિત પ્રતીક્ષા<",
    ">Please wait your turn.<": ">કૃપા કરીને તમારા વારાની રાહ જુઓ.<",
    ">It's your turn!<": ">હવે તમારો વારો છે!<",
    ">Proceed to counter.<": ">કાઉન્ટર પર જાઓ.<",
    ">Token Completed<": ">ટોકન પૂર્ણ થયું<",
    ">Your token was cancelled.<": ">તમારું ટોકન રદ કરવામાં આવ્યું હતું.<",
    ">You missed your turn.<": ">તમે તમારો વારો ચૂકી ગયા છો.<",
    ">Service Details<": ">સેવા વિગતો<",
    ">Office<": ">કચેરી<",
    ">Service<": ">સેવા<",
    ">Counter<": ">કાઉન્ટર<",
    ">Not Assigned<": ">ફાળવેલ નથી<",
    ">Cancel Token<": ">ટોકન રદ કરો<"
}
e, g = process_single(os.path.join(base_path, "pages", "TokenLive.jsx"), token_map, "tok")
all_en.update(e); all_gu.update(g)

update_locales(all_en, all_gu)
