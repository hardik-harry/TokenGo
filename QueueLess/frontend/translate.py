import os
import re

def process_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original = content
    for k, v in replacements.items():
        content = content.replace(k, v)
        
    if content != original:
        if "react-i18next" not in content:
            content = "import { useTranslation } from 'react-i18next';\n" + content
            
        # Try to inject const { t } = useTranslation();
        # Find the first functional component declaration.
        # usually looks like: const Component = () => { or function Component() {
        if "const { t } = useTranslation();" not in content:
            # Simple heuristic
            content = re.sub(r'(const \w+(?: \= \(\)| \= \(\{.*\}\)|) \=\> \{)', r'\1\n  const { t } = useTranslation();', content, 1)
            content = re.sub(r'(function \w+\(.*\) \{)', r'\1\n  const { t } = useTranslation();', content, 1)
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched {filepath}")

replacements = {
    "Get your virtual token online.": "{t('home_heading_1')}",
    "Skip the waiting room.": "{t('home_heading_2')}",
    "OFFICIAL GOVERNMENT PORTAL": "{t('home_official_portal')}",
    "Reserve your spot ahead of time securely and track real-time queue fluctuations driven by state-of-the-art predictive algorithms directly from your device.": "{t('home_subheading')}",
    "Token Generator Widget": "{t('home_widget_title')}",
    "Select RTO Office": "{t('home_select_rto')}",
    "-- Choose an Office --": "{t('home_choose_office')}",
    "Select Required Service": "{t('home_select_service')}",
    "-- Choose a Service --": "{t('home_choose_service')}",
    "Calculating wait bounds...": "{t('home_calculating')}",
    "Estimated Wait": "{t('home_estimated_wait')}",
    "Recommended Arrival": "{t('home_recommended_arrival')}",
    "Bounds:": "{t('home_bounds')}",
    "Source:": "{t('home_source')}",
    "Get Virtual Line Token": "{t('home_get_token')}",
    "How It Works": "{t('home_how_it_works')}",
    "A seamless 4-step process utilizing predictive logic organically": "{t('home_process_desc')}",
    ">1. Locate RTO Center<": ">{t('home_step1_title')}<",
    "Choose your localized transport office from our real-time mapped selections.": "{t('home_step1_desc')}",
    ">2. Select Need<": ">{t('home_step2_title')}<",
    "Identify whether you are registering a permit or renewing a credential quickly.": "{t('home_step2_desc')}",
    ">3. Reserve Spot<": ">{t('home_step3_title')}<",
    "Generate your virtual token completely tying into backend machine learning bounds.": "{t('home_step3_desc')}",
    ">4. Arrive On-Time<": ">{t('home_step4_title')}<",
    "Walk right into the counter skipping hours of dead wait times organically.": "{t('home_step4_desc')}"
}

replacements_nav = {
    ">Home<": ">{t('nav_home')}<",
    ">How It Works<": ">{t('nav_how_it_works')}<",
    ">Track Token<": ">{t('nav_track_token')}<",
    ">Help<": ">{t('nav_help')}<",
    ">Login<": ">{t('nav_login')}<",
    ">Dashboard<": ">{t('nav_dashboard')}<"
}

import sys
base_path = r"c:\Users\HARDIK DABHI\OneDrive\Desktop\hackathon\project\QueueLess\frontend\src"

process_file(os.path.join(base_path, "pages", "Home.jsx"), {**replacements, **replacements_nav})
process_file(os.path.join(base_path, "components", "Footer.jsx"), {
    "Quick Links": "{t('footer_quick_links')}",
    ">Citizen Rights<": ">{t('footer_citizen_rights')}<",
    ">RTO Directory<": ">{t('footer_rto_directory')}<",
    ">Contact<": ">{t('footer_contact')}<",
    **replacements_nav
})
