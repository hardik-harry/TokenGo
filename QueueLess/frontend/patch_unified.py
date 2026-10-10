import os
import re

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
            
            # Logic to retain angle brackets if the original mapped string included them intentionally!
            replacement = f"{{t('{key}')}}"
            if en_str.startswith(">") and en_str.endswith("<"):
                replacement = f">{{t('{key}')}}<"
            
            content = content.replace(en_str, replacement)
            
            # stripping angle brackets for the JSON files
            clean_en = en_str.strip(">").strip("<")
            clean_gu = gu_str.strip(">").strip("<")
            
            en_dict[key] = clean_en
            gu_dict[key] = clean_gu
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

def run_patches():
    all_en = {}
    all_gu = {}
    
    def apply(rel_path, ms, pre):
        e, g = process_single(os.path.join(base_path, *rel_path), ms, pre)
        all_en.update(e); all_gu.update(g)

    # Home.jsx
    apply(["pages", "Home.jsx"], {
        "Get your virtual token online.": "તમારું વર્ચ્યુઅલ ટોકન ઓનલાઈન મેળવો.",
        "Skip the waiting room.": "પ્રતીક્ષા ખંડ છોડો.",
        "OFFICIAL GOVERNMENT PORTAL": "અધિકૃત સરકારી પોર્ટલ",
        "Reserve your spot ahead of time securely and track real-time queue fluctuations driven by state-of-the-art predictive algorithms directly from your device.": "અગાઉથી સુરક્ષિત રીતે તમારું સ્થાન આરક્ષિત કરો અને તમારા ઉપકરણથી સીધા જ અત્યાધુનિક અનુમાનાત્મક અલ્ગોરિધમ્સ દ્વારા સંચાલિત રીઅલ-ટાઇમ કતાર વધઘટને ટ્રૅક કરો.",
        "Token Generator Widget": "ટોકન જનરેટર વિજેટ",
        "Select RTO Office": "RTO કચેરી પસંદ કરો",
        "-- Choose an Office --": "-- કચેરી પસંદ કરો --",
        "Select Required Service": "આવશ્યક સેવા પસંદ કરો",
        "-- Choose a Service --": "-- સેવા પસંદ કરો --",
        "Calculating wait bounds...": "પ્રતીક્ષા સમય ગણતરી ચાલી રહી છે...",
        "Estimated Wait": "અંદાજિત પ્રતીક્ષા",
        "Recommended Arrival": "ભલામણ કરેલ આગમન",
        "Bounds:": "મર્યાદા:",
        "Source:": "સ્ત્રોત:",
        "Get Virtual Line Token": "વર્ચ્યુઅલ લાઇન ટોકન મેળવો",
        "How It Works": "તે કેવી રીતે કામ કરે છે",
        "A seamless 4-step process utilizing predictive logic organically": "અનુમાનાત્મક તર્કનો ઉપયોગ કરતી એક સીમલેસ 4-સ્ટેપ પ્રક્રિયા",
        ">1. Locate RTO Center<": ">1. RTO કેન્દ્ર શોધો<",
        "Choose your localized transport office from our real-time mapped selections.": "અમારી રીઅલ-ટાઇમ મેપ કરેલી પસંદગીઓમાંથી તમારી સ્થાનિક પરિવહન કચેરી પસંદ કરો.",
        ">2. Select Need<": ">2. જરૂરિયાત પસંદ કરો<",
        "Identify whether you are registering a permit or renewing a credential quickly.": "તમે પરમિટ રજીસ્ટર કરી રહ્યા છો કે ઓળખપત્ર રીન્યુ કરી રહ્યા છો તે ઓળખો.",
        ">3. Reserve Spot<": ">3. સ્થાન આરક્ષિત કરો<",
        "Generate your virtual token completely tying into backend machine learning bounds.": "તમારું વર્ચ્યુઅલ ટોકન બનાવો જે મશીન લર્નિંગ અનુમાનો સાથે જોડાય છે.",
        ">4. Arrive On-Time<": ">4. સમયસર પહોંચો<",
        "Walk right into the counter skipping hours of dead wait times organically.": "કલાકોની નિરર્થક પ્રતીક્ષા ટાળીને સીધા જ કાઉન્ટર પર જાઓ.",
        ">Home<": ">મુખ્ય પૃષ્ઠ<",
        ">How It Works<": ">તે કેવી રીતે કામ કરે છે<",
        ">Track Token<": ">ટોકન ટ્રૅક કરો<",
        ">Help<": ">મદદ<",
        ">Login<": ">લૉગિન<",
        ">Dashboard<": ">ડેશબોર્ડ<"
    }, "home")

    apply(["components", "Footer.jsx"], {
        "Quick Links": "ઝડપી લિંક્સ",
        ">Citizen Rights<": ">નાગરિક અધિકારો<",
        ">RTO Directory<": ">RTO ડિરેક્ટરી<",
        ">Contact<": ">સંપર્ક<"
    }, "footer")
    
    apply(["pages", "Login.jsx"], {
        ">Login to TokenGo<": ">TokenGo માં લૉગિન કરો<",
        ">Email Address<": ">ઇમેઇલ સરનામું<",
        ">Password<": ">પાસવર્ડ<",
        ">Logging in...<": ">લૉગિન થઈ રહ્યું છે...<",
        "Login</button>": "લૉગિન</button>",
        ">Don't have an account? <": ">શું તમારી પાસે ખાતું નથી? <",
        ">Register here<": ">અહીં નોંધણી કરો<"
    }, "login")

    apply(["pages", "Register.jsx"], {
        ">Create an Account<": ">ખાતું બનાવો<",
        ">Full Name<": ">પૂરું નામ<",
        ">Phone Number (10 digits)<": ">ફોન નંબર (10 અંકો)<",
        ">Creating Account...<": ">ખાતું બની રહ્યું છે...<",
        ">Register<": ">નોંધણી કરો<",
        ">Already have an account? <": ">શું પહેલેથી જ ખાતું છે? <",
        ">Login here<": ">અહીં લૉગિન કરો<",
        ">A secure password must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.<": ">સુરક્ષિત પાસવર્ડમાં ઓછામાં ઓછા 8 અક્ષરો, એક કેપિટલ અક્ષર, એક નાનો અક્ષર, એક નંબર અને એક વિશિષ્ટ અક્ષર હોવો જરૂરી છે.<"
    }, "reg")

    apply(["pages", "TokenLive.jsx"], {
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
        ">Cancel Token<": ">ટોકન રદ કરો<",
        "Cancel Reservation": "આરક્ષણ રદ કરો"
    }, "tok")

    apply(["pages", "Help.jsx"], {
        ">Help Center & FAQ<": ">સહાય કેન્દ્ર અને વારંવાર પૂછાતા પ્રશ્નો<",
        ">How can we assist you today?<": ">આજે અમે તમને કેવી રીતે મદદ કરી શકીએ?<",
        ">Common Questions<": ">સામાન્ય પ્રશ્નો<",
        ">How is the wait time calculated?<": ">પ્રતીક્ષા સમયની ગણતરી કેવી રીતે થાય છે?<",
        ">Can I cancel my token?<": ">શું હું મારું ટોકન રદ કરી શકું?<",
        ">What happens if I miss my turn?<": ">જો હું મારો વારો ચૂકી જાઉં તો શું થાય?<",
        ">Need More Help?<": ">વધુ સહાયની જરૂર છે?<",
        ">If you cannot find the answer you are looking for, please reach out to our team.<": ">જો તમને તમારો જવાબ ન મળે, તો કૃપા કરીને અમારી ટીમનો સંપર્ક કરો.<",
        ">Contact Support<": ">આધાર માટે સંપર્ક કરો<"
    }, "help")

    apply(["pages", "Contact.jsx"], {
        ">Contact Us<": ">અમારો સંપર્ક કરો<",
        ">We're here to help and answer any question you might have.<": ">અમે મદદ કરવા અને તમારા કોઈપણ પ્રશ્નનો ઉકેલ લાવવા માટે અહીં છીએ.<",
        ">Send Message<": ">સંદેશો મોકલો<",
        ">Full Name<": ">પૂરું નામ<",
        ">Email Address<": ">ઇમેઇલ સરનામું<",
        ">Message<": ">સંદેશો<"
    }, "contact")

    apply(["pages", "TrackRedirect.jsx"], {
        ">Track Your Token<": ">તમારું ટોકન ટ્રૅક કરો<",
        ">Enter your 6-character token reference ID to view its live status and estimated wait time.<": ">લાઇવ સ્થિતિ અને પ્રતીક્ષા સમય જોવા માટે તમારો 6 અક્ષરનો ટોકન સંદર્ભ નંબર દાખલ કરો.<",
        ">Token Reference ID<": ">ટોકન સંદર્ભ નંબર<",
        ">e.g. A3F9B2<": ">ઉદા. A3F9B2<",
        ">Track Token<": ">ટોકન ટ્રૅક કરો<"
    }, "track")

    apply(["pages", "TokenVerify.jsx"], {
        ">Official Token Verification<": ">અધિકૃત ટોકન ચકાસણી<",
        ">Authentic Token<": ">અસલ ટોકન<",
        ">Invalid or Expired Token<": ">અમાન્ય અથવા નિવૃત્ત ટોકન<"
    }, "verif")
    
    # Merge outputs safely
    import json
    def merge(filepath, d):
        if not os.path.exists(filepath):
            with open(filepath, 'w') as f:
                json.dump({}, f)
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        data.update(d)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
    merge(os.path.join(base_path, "locales", "en.json"), all_en)
    merge(os.path.join(base_path, "locales", "gu.json"), all_gu)

run_patches()
