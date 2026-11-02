/*
 * MOBILE NETWORK CASCADING SELECTOR — 195 COUNTRIES
 * =================================================
 *
 * PURPOSE:
 * -------
 * Allows the app to connect:
 *
 *     CONTINENT
 *          ↓
 *       COUNTRY
 *          ↓
 *   MOBILE NETWORK
 *
 * Example:
 *
 *     Botswana
 *        ↓
 *     BTC BeMobile
 *     Mascom
 *     Orange
 *
 *
 * DATA:
 * -----
 * 195 countries
 *
 * Africa        = 54
 * Asia          = 48
 * Europe        = 44
 * North America = 23
 * Oceania       = 14
 * South America = 12
 *
 *
 * BROWSER USAGE:
 * ---------------
 *
 * <script src="countries_mobile_networks.js"></script>
 *
 *
 * BASIC INITIALISATION:
 *
 * MobileNetworkForm.init({
 *     countrySelectId: "country",
 *     networkSelectId: "mobileNetwork"
 * });
 *
 *
 * DIRECT DATA ACCESS:
 *
 * COUNTRY_MOBILE_NETWORKS["Botswana"]
 *
 * returns:
 *
 * [
 *     "BTC BeMobile",
 *     "Mascom",
 *     "Orange"
 * ]
 *
 */

(function (window) {

    "use strict";


    // ============================================================
    // COUNTRY → MOBILE NETWORK DATA
    // ============================================================

    const COUNTRY_MOBILE_NETWORKS = {

        // ========================================================
        // AFRICA
        // ========================================================

        "Algeria": [
            "Mobilis (Algérie Télécom)",
            "Djezzy",
            "Ooredoo Algeria"
        ],

        "Angola": [
            "Unitel",
            "Movicel",
            "Africell Angola"
        ],

        "Benin": [
            "MTN Benin",
            "Moov Africa Benin",
            "Celtiis (SBIN)",
            "Glo Benin"
        ],

        "Botswana": [
            "BTC BeMobile",
            "Mascom",
            "Orange"
        ],

        "Burkina Faso": [
            "Orange Burkina Faso",
            "Moov Africa Onatel",
            "Telecel Faso"
        ],

        "Burundi": [
            "Lumitel (Viettel)",
            "Econet Leo",
            "ONAMOB (Onatel)",
            "Smart Mobile (Lacell)"
        ],

        "Cabo Verde": [
            "CV Móvil (Cabo Verde Telecom)",
            "Unitel T+"
        ],

        "Cameroon": [
            "MTN Cameroon",
            "Orange Cameroon",
            "Nexttel (Viettel)",
            "Camtel Mobile"
        ],

        "Central African Republic": [
            "Telecel Centrafrique",
            "Orange CAR",
            "Moov Africa CAR",
            "Azur CAR"
        ],

        "Chad": [
            "Moov Africa Chad",
            "Airtel Chad",
            "Salam Mobile (Sotel Tchad)"
        ],

        "Comoros": [
            "Huri (Comores Telecom)",
            "Telco SA (Telma Comores / Axian Group)"
        ],

        "Republic of the Congo": [
            "MTN Congo",
            "Airtel Congo",
            "Azur Congo"
        ],

        "Democratic Republic of the Congo": [
            "Vodacom DRC",
            "Orange DRC",
            "Airtel DRC",
            "Africell DRC"
        ],

        "Côte d'Ivoire": [
            "Orange Côte d'Ivoire",
            "MTN Côte d'Ivoire",
            "Moov Africa CI"
        ],

        "Djibouti": [
            "Evatis (Djibouti Telecom)"
        ],

        "Egypt": [
            "Vodafone Egypt",
            "Orange Egypt",
            "Etisalat Misr (e&)",
            "WE (Telecom Egypt)"
        ],

        "Equatorial Guinea": [
            "GETESA (Orange Guinea Ecuatorial)",
            "Muni Equatorial Guinea"
        ],

        "Eritrea": [
            "Eritel (Eritrean Telecommunications Corporation)"
        ],

        "Eswatini": [
            "MTN Eswatini",
            "Eswatini Mobile"
        ],

        "Ethiopia": [
            "Ethio Telecom",
            "Safaricom Telecommunications Ethiopia"
        ],

        "Gabon": [
            "Airtel Gabon",
            "Moov Africa Gabon Telecom",
            "Libertis"
        ],

        "Gambia": [
            "Africell Gambia",
            "Gamcel",
            "QCell Gambia",
            "Comium Gambia"
        ],

        "Ghana": [
            "MTN Ghana",
            "Telecel Ghana (formerly Vodafone Ghana)",
            "AT (AirtelTigo)"
        ],

        "Guinea": [
            "Orange Guinée",
            "MTN Guinea",
            "Cellcom Guinee"
        ],

        "Guinea-Bissau": [
            "Orange Bissau",
            "MTN Guinea-Bissau"
        ],

        "Kenya": [
            "Safaricom",
            "Airtel Kenya",
            "Telkom Kenya"
        ],

        "Lesotho": [
            "Vodacom Lesotho",
            "Econet Telecom Lesotho"
        ],

        "Liberia": [
            "Lonestar Cell MTN",
            "Orange Liberia"
        ],

        "Libya": [
            "Libyana",
            "Al-Madar Al-Jadid"
        ],

        "Madagascar": [
            "Telma Madagascar (Axian Group)",
            "Orange Madagascar",
            "Airtel Madagascar"
        ],

        "Malawi": [
            "Airtel Malawi",
            "TNM (Telekom Networks Malawi)"
        ],

        "Mali": [
            "Orange Mali",
            "Moov Africa Malitel",
            "Telecel Mali"
        ],

        "Mauritania": [
            "Mauritel",
            "Chinguitel",
            "Mattel"
        ],

        "Mauritius": [
            "my.t (Mauritius Telecom)",
            "Emtel",
            "CHiLi (MTML)"
        ],

        "Morocco": [
            "Maroc Telecom",
            "Orange Maroc",
            "Inwi"
        ],

        "Mozambique": [
            "Vodacom Mozambique",
            "Movitel (Viettel)",
            "Tmcel"
        ],

        "Namibia": [
            "MTC (Mobile Telecommunications Company)",
            "tn mobile (Telecom Namibia)"
        ],

        "Niger": [
            "Airtel Niger",
            "Moov Africa Niger",
            "Zamani Telecom (formerly Orange Niger)"
        ],

        "Nigeria": [
            "MTN Nigeria",
            "Airtel Nigeria",
            "Globacom (Glo)",
            "9mobile"
        ],

        "Rwanda": [
            "MTN Rwanda",
            "Airtel Rwanda"
        ],

        "São Tomé and Príncipe": [
            "CST (Companhia Santomense de Telecomunicações)",
            "Unitel STP"
        ],

        "Senegal": [
            "Orange Senegal (Sonatel)",
            "Free Senegal",
            "Expresso Senegal"
        ],

        "Seychelles": [
            "Airtel Seychelles",
            "Cable & Wireless Seychelles"
        ],

        "Sierra Leone": [
            "Africell Sierra Leone",
            "Orange Sierra Leone",
            "QCell Sierra Leone"
        ],

        "Somalia": [
            "Hormuud Telecom",
            "Somtel",
            "Golis Telecom",
            "NationLink Telecom"
        ],

        "South Africa": [
            "Vodacom South Africa",
            "MTN South Africa",
            "Cell C",
            "Telkom Mobile"
        ],

        "South Sudan": [
            "MTN South Sudan",
            "Zain South Sudan",
            "Digitel South Sudan"
        ],

        "Sudan": [
            "Zain Sudan",
            "MTN Sudan",
            "Sudani"
        ],

        "Tanzania": [
            "Vodacom Tanzania",
            "Airtel Tanzania",
            "Tigo Tanzania (Axian)",
            "Halotel (Viettel)",
            "TTCL Mobile"
        ],

        "Togo": [
            "Togocom (Togocel / Axian)",
            "Moov Africa Togo"
        ],

        "Tunisia": [
            "Tunisie Telecom",
            "Ooredoo Tunisia",
            "Orange Tunisie"
        ],

        "Uganda": [
            "MTN Uganda",
            "Airtel Uganda",
            "UT Mobile"
        ],

        "Zambia": [
            "Airtel Zambia",
            "MTN Zambia",
            "Zamtel"
        ],

        "Zimbabwe": [
            "Econet Wireless Zimbabwe",
            "NetOne",
            "Telecel Zimbabwe"
        ],


        // ========================================================
        // ASIA
        // ========================================================

        "Afghanistan": [
            "ATOMA (formerly MTN Afghanistan)",
            "Roshan",
            "Etisalat Afghanistan",
            "Afghan Wireless",
            "Salaam"
        ],

        "Armenia": [
            "Viva (Fedilco Group / State-owned)",
            "Team Telecom Armenia",
            "Ucom"
        ],

        "Azerbaijan": [
            "Azercell",
            "Bakcell",
            "Nar",
            "Nakhtel"
        ],

        "Bahrain": [
            "Batelco",
            "Zain Bahrain",
            "stc Bahrain"
        ],

        "Bangladesh": [
            "Grameenphone",
            "Robi",
            "Banglalink",
            "Teletalk"
        ],

        "Bhutan": [
            "B-Mobile (Bhutan Telecom)",
            "TashiCell"
        ],

        "Brunei": [
            "DST (Datastream Digital)",
            "Progresif"
        ],

        "Cambodia": [
            "Metfone (Viettel)",
            "Smart Axiata",
            "Cellcard"
        ],

        "China": [
            "China Mobile",
            "China Telecom",
            "China Unicom",
            "China Broadnet"
        ],

        "Cyprus": [
            "Cyta Mobile-Vodafone",
            "Epic Cyprus",
            "PrimeTel"
        ],

        "Georgia": [
            "MagtiCom",
            "Silknet",
            "Cellfie (formerly Beeline Georgia)"
        ],

        "India": [
            "Jio",
            "Bharti Airtel",
            "Vi (Vodafone Idea)",
            "BSNL Mobile"
        ],

        "Indonesia": [
            "Telkomsel",
            "Indosat Ooredoo Hutchison",
            "XLSMART"
        ],

        "Iran": [
            "MCI (Hamrah-e Aval)",
            "MTN Irancell",
            "RighTel"
        ],

        "Iraq": [
            "Zain Iraq",
            "Asiacell",
            "Korek Telecom"
        ],

        "Israel": [
            "Cellcom Israel",
            "Partner",
            "Pelephone",
            "HOT Mobile"
        ],

        "Japan": [
            "NTT DOCOMO",
            "KDDI (au)",
            "SoftBank",
            "Rakuten Mobile"
        ],

        "Jordan": [
            "Zain Jordan",
            "Orange Jordan",
            "Umniah"
        ],

        "Kazakhstan": [
            "Beeline Kazakhstan",
            "Kcell / Activ",
            "Tele2 Kazakhstan / Altel"
        ],

        "Kuwait": [
            "Zain Kuwait",
            "stc Kuwait",
            "Ooredoo Kuwait"
        ],

        "Kyrgyzstan": [
            "MegaCom (Alpha Telecom)",
            "Beeline Kyrgyzstan",
            "O! (Nur Telecom)"
        ],

        "Laos": [
            "Unitel (Star Telecom)",
            "Lao Telecom",
            "Tplus",
            "ETL"
        ],

        "Lebanon": [
            "touch (MTC)",
            "Alfa"
        ],

        "Malaysia": [
            "CelcomDigi",
            "Maxis",
            "U Mobile",
            "Yes 5G",
            "Unifi Mobile"
        ],

        "Maldives": [
            "Dhiraagu",
            "Ooredoo Maldives"
        ],

        "Mongolia": [
            "Mobicom",
            "Unitel",
            "Skytel",
            "G-Mobile",
            "ONDO"
        ],

        "Myanmar (Burma)": [
            "MPT",
            "ATOM (formerly Telenor Myanmar)",
            "Ooredoo Myanmar",
            "Mytel"
        ],

        "Nepal": [
            "Nepal Telecom",
            "Ncell",
            "SmartCell"
        ],

        "North Korea": [
            "Koryolink",
            "Kangsong NET"
        ],

        "Oman": [
            "Omantel",
            "Ooredoo Oman",
            "Vodafone Oman"
        ],

        "Pakistan": [
            "Jazz",
            "Zong",
            "Telenor Pakistan",
            "Ufone"
        ],

        "State of Palestine": [
            "Jawwal",
            "Ooredoo Palestine"
        ],

        "Philippines": [
            "Globe Telecom",
            "Smart Communications",
            "DITO Telecommunity"
        ],

        "Qatar": [
            "Ooredoo Qatar",
            "Vodafone Qatar"
        ],

        "Saudi Arabia": [
            "stc (Saudi Telecom Company)",
            "Mobily",
            "Zain KSA"
        ],

        "Singapore": [
            "Singtel",
            "StarHub",
            "M1",
            "SIMBA Telecom"
        ],

        "South Korea": [
            "SK Telecom",
            "KT",
            "LG U+"
        ],

        "Sri Lanka": [
            "Dialog Axiata",
            "SLT-MOBITEL",
            "Hutch Sri Lanka"
        ],

        "Syria": [
            "Syriatel",
            "MTN Syria",
            "Wafa Telecom"
        ],

        "Tajikistan": [
            "Tcell",
            "Babilon-Mobile",
            "ZET Mobile (formerly Beeline)",
            "MegaFon Tajikistan"
        ],

        "Thailand": [
            "AIS",
            "True Corp (TrueMove H / dtac)",
            "National Telecom (NT Mobile)"
        ],

        "Timor-Leste": [
            "Telemor",
            "Timor Telecom",
            "Telkomcel"
        ],

        "Türkiye (Turkey)": [
            "Turkcell",
            "Vodafone Türkiye",
            "Türk Telekom"
        ],

        "Turkmenistan": [
            "TM-Cell (Altyn Asyr)"
        ],

        "United Arab Emirates": [
            "e& (Etisalat)",
            "du"
        ],

        "Uzbekistan": [
            "Beeline Uzbekistan",
            "Ucell",
            "Mobiuz",
            "Uztelecom (UzMobile)"
        ],

        "Vietnam": [
            "Viettel Mobile",
            "Vinaphone",
            "MobiFone",
            "Vietnamobile"
        ],

        "Yemen": [
            "Yemen Mobile",
            "Sabafon",
            "YOU (formerly MTN Yemen)",
            "Y-Telecom"
        ],


        // ========================================================
        // EUROPE
        // ========================================================

        "Albania": [
            "One Albania (4iG Group)",
            "Vodafone Albania"
        ],

        "Andorra": [
            "Andorra Telecom"
        ],

        "Austria": [
            "Magenta Telekom (Deutsche Telekom)",
            "A1 Telekom Austria",
            "Drei Austria (CK Hutchison)"
        ],

        "Belarus": [
            "MTS Belarus",
            "A1 Belarus",
            "life:) Belarus"
        ],

        "Belgium": [
            "Proximus",
            "Orange Belgium",
            "Base (Telenet)",
            "DIGI Belgium"
        ],

        "Bosnia and Herzegovina": [
            "BH Mobile",
            "m:tel BiH",
            "HT ERONET"
        ],

        "Bulgaria": [
            "Vivacom",
            "Yettel Bulgaria",
            "A1 Bulgaria"
        ],

        "Croatia": [
            "Hrvatski Telekom",
            "A1 Hrvatska",
            "Telemach Hrvatska"
        ],

        "Czechia (Czech Republic)": [
            "T-Mobile Czech Republic",
            "O2 Czech Republic",
            "Vodafone Czech Republic"
        ],

        "Denmark": [
            "TDC NET / YouSee",
            "3 Denmark",
            "Telenor Denmark",
            "Telia Denmark"
        ],

        "Estonia": [
            "Telia Estonia",
            "Elisa Estonia",
            "Tele2 Estonia"
        ],

        "Finland": [
            "Elisa",
            "Telia Finland",
            "DNA (Telenor)"
        ],

        "France": [
            "Orange France",
            "SFR",
            "Bouygues Telecom",
            "Free Mobile"
        ],

        "Germany": [
            "Telekom Deutschland",
            "Vodafone Germany",
            "O2 Telefónica",
            "1&1 5G"
        ],

        "Greece": [
            "Telekom Greece (Cosmote)",
            "Vodafone Greece",
            "Nova"
        ],

        "Holy See (Vatican City)": [
            "TIM",
            "Vodafone Italy",
            "Wind Tre",
            "Iliad Italia"
        ],

        "Hungary": [
            "Yettel Hungary",
            "One Hungary (formerly Vodafone Hungary)",
            "Magyar Telekom"
        ],

        "Iceland": [
            "Síminn",
            "Vodafone Iceland",
            "Nova"
        ],

        "Ireland": [
            "Vodafone Ireland",
            "Three Ireland",
            "Eir Mobile"
        ],

        "Italy": [
            "TIM (Telecom Italia)",
            "Vodafone Italy",
            "Wind Tre",
            "Iliad Italia"
        ],

        "Latvia": [
            "LMT",
            "Tele2 Latvia",
            "Bite Latvia"
        ],

        "Liechtenstein": [
            "Telecom Liechtenstein",
            "Swisscom",
            "Sunrise",
            "Salt"
        ],

        "Lithuania": [
            "Telia Lietuva",
            "Tele2 Lithuania",
            "Bitė Lietuva"
        ],

        "Luxembourg": [
            "POST Telecom",
            "Tango Luxembourg",
            "Orange Luxembourg"
        ],

        "Malta": [
            "Epic Malta",
            "GO Mobile",
            "Melita"
        ],

        "Moldova": [
            "Orange Moldova",
            "Moldcell",
            "Unité"
        ],

        "Monaco": [
            "Monaco Telecom"
        ],

        "Montenegro": [
            "One Crna Gora",
            "Mtel Crna Gora",
            "Crnogorski Telekom"
        ],

        "Netherlands": [
            "Odido",
            "KPN",
            "Vodafone Netherlands"
        ],

        "North Macedonia": [
            "Makedonski Telekom",
            "A1 Makedonija"
        ],

        "Norway": [
            "Telenor Norway",
            "Telia Norway",
            "Ice Communication"
        ],

        "Poland": [
            "Play (Iliad)",
            "Orange Polska",
            "Plus (Polkomtel)",
            "T-Mobile Polska"
        ],

        "Portugal": [
            "MEO (Altice)",
            "NOS",
            "Vodafone Portugal",
            "DIGI Portugal"
        ],

        "Romania": [
            "Orange Romania",
            "Vodafone Romania",
            "Digi.Mobil",
            "Telekom Romania Mobile"
        ],

        "Russia": [
            "MTS",
            "MegaFon",
            "Beeline",
            "t2 (formerly Tele2 Russia)"
        ],

        "San Marino": [
            "TIM San Marino",
            "WINDTRE San Marino"
        ],

        "Serbia": [
            "MTS (Telekom Srbija)",
            "Yettel Serbia",
            "A1 Srbija"
        ],

        "Slovakia": [
            "Orange Slovensko",
            "Slovak Telekom",
            "O2 Slovakia",
            "4ka"
        ],

        "Slovenia": [
            "Telekom Slovenije",
            "A1 Slovenija",
            "Telemach Slovenija",
            "T-2"
        ],

        "Spain": [
            "Movistar",
            "MasOrange",
            "Vodafone España",
            "Digi España"
        ],

        "Sweden": [
            "Telia Sweden",
            "Tele2 Sweden",
            "Telenor Sweden",
            "3 Sweden"
        ],

        "Switzerland": [
            "Swisscom",
            "Sunrise",
            "Salt Mobile"
        ],

        "Ukraine": [
            "Kyivstar",
            "Vodafone Ukraine",
            "lifecell"
        ],

        "United Kingdom": [
            "Vodafone",
            "O2",
            "EE",
            "Three"
        ],


        // ========================================================
        // NORTH AMERICA
        // ========================================================

        "Antigua and Barbuda": [
            "inet (APUA)",
            "Digicel Antigua",
            "FLOW Antigua"
        ],

        "Bahamas": [
            "BTC (Liberty Latin America)",
            "Aliv"
        ],

        "Barbados": [
            "FLOW Barbados",
            "Digicel Barbados"
        ],

        "Belize": [
            "Digi (BTL)",
            "Smart"
        ],

        "Canada": [
            "Rogers Wireless",
            "Bell Mobility",
            "Telus Mobility",
            "Freedom Mobile / Vidéotron",
            "SaskTel"
        ],

        "Costa Rica": [
            "kölbi (ICE)",
            "Claro Costa Rica",
            "Liberty Mobile Costa Rica"
        ],

        "Cuba": [
            "Cubacel (ETECSA)"
        ],

        "Dominica": [
            "Digicel Dominica",
            "FLOW Dominica"
        ],

        "Dominican Republic": [
            "Claro República Dominicana",
            "Altice Do",
            "Viva"
        ],

        "El Salvador": [
            "Tigo El Salvador",
            "Claro El Salvador",
            "Movistar El Salvador",
            "Digicel El Salvador"
        ],

        "Grenada": [
            "FLOW Grenada",
            "Digicel Grenada"
        ],

        "Guatemala": [
            "Tigo Guatemala",
            "Claro Guatemala"
        ],

        "Haiti": [
            "Digicel Haiti",
            "Natcom"
        ],

        "Honduras": [
            "Tigo Honduras",
            "Claro Honduras"
        ],

        "Jamaica": [
            "Digicel Jamaica",
            "FLOW Jamaica"
        ],

        "Mexico": [
            "Telcel (América Móvil)",
            "AT&T Mexico",
            "Movistar Mexico"
        ],

        "Nicaragua": [
            "Claro Nicaragua",
            "Tigo Nicaragua"
        ],

        "Panama": [
            "Tigo Panamá",
            "Más Móvil (Cable & Wireless Panama)"
        ],

        "Saint Kitts and Nevis": [
            "Digicel St. Kitts & Nevis",
            "FLOW St. Kitts & Nevis"
        ],

        "Saint Lucia": [
            "FLOW Saint Lucia",
            "Digicel Saint Lucia"
        ],

        "Saint Vincent and the Grenadines": [
            "Digicel St. Vincent",
            "FLOW St. Vincent"
        ],

        "Trinidad and Tobago": [
            "bmobile (TSTT)",
            "Digicel Trinidad & Tobago"
        ],

        "United States of America": [
            "Verizon Wireless",
            "T-Mobile US",
            "AT&T Mobility",
            "UScellular",
            "C Spire"
        ],


        // ========================================================
        // OCEANIA
        // ========================================================

        "Australia": [
            "Telstra",
            "Optus",
            "Vodafone Australia (TPG Telecom)"
        ],

        "Fiji": [
            "Vodafone Fiji (ATH)",
            "Digicel Fiji (Telstra)"
        ],

        "Kiribati": [
            "Vodafone Kiribati (ATH)"
        ],

        "Marshall Islands": [
            "NTA Mobile (Marshall Islands National Telecommunications Authority)"
        ],

        "Micronesia (Federated States of)": [
            "FSM Telecom"
        ],

        "Nauru": [
            "Digicel Nauru"
        ],

        "New Zealand": [
            "One NZ",
            "Spark New Zealand",
            "2degrees"
        ],

        "Palau": [
            "PNCC Mobile"
        ],

        "Papua New Guinea": [
            "Digicel PNG (Telstra)",
            "Vodafone PNG (ATH)",
            "Telikom PNG"
        ],

        "Samoa": [
            "Vodafone Samoa (ATH)",
            "Digicel Samoa"
        ],

        "Solomon Islands": [
            "Our Telekom",
            "Bmobile Solomon Islands"
        ],

        "Tonga": [
            "Digicel Tonga",
            "TCC U-Call"
        ],

        "Tuvalu": [
            "TTC Mobile (Tuvalu Telecommunications Corporation)"
        ],

        "Vanuatu": [
            "Vodafone Vanuatu",
            "Digicel Vanuatu",
            "WanTok"
        ],


        // ========================================================
        // SOUTH AMERICA
        // ========================================================

        "Argentina": [
            "Personal (Telecom Argentina)",
            "Movistar Argentina",
            "Claro Argentina"
        ],

        "Bolivia": [
            "Entel Bolivia",
            "Tigo Bolivia",
            "Viva"
        ],

        "Brazil": [
            "Vivo (Telefônica Brasil)",
            "Claro Brasil",
            "TIM Brasil",
            "Algar Telecom"
        ],

        "Chile": [
            "Entel Chile",
            "Movistar Chile",
            "WOM Chile",
            "Claro Chile"
        ],

        "Colombia": [
            "Claro Colombia",
            "Movistar Colombia",
            "Tigo Colombia",
            "WOM Colombia"
        ],

        "Ecuador": [
            "Claro Ecuador",
            "Movistar Ecuador",
            "CNT Mobile"
        ],

        "Guyana": [
            "One Communications Guyana (formerly GTT)",
            "Digicel Guyana"
        ],

        "Paraguay": [
            "Tigo Paraguay",
            "Claro Paraguay",
            "Personal Paraguay",
            "Vox (COPACO)"
        ],

        "Peru": [
            "Claro Perú",
            "Movistar Perú",
            "Entel Perú",
            "Bitel"
        ],

        "Suriname": [
            "Telesur",
            "Digicel Suriname"
        ],

        "Uruguay": [
            "Antel",
            "Movistar Uruguay",
            "Claro Uruguay"
        ],

        "Venezuela": [
            "Movilnet",
            "Movistar Venezuela",
            "Digitel"
        ]

    };


    // ============================================================
    // CONTINENT → COUNTRY RELATIONSHIP
    // ============================================================

    const COUNTRY_MOBILE_NETWORKS_BY_CONTINENT = {

        "Africa": [
            "Algeria",
            "Angola",
            "Benin",
            "Botswana",
            "Burkina Faso",
            "Burundi",
            "Cabo Verde",
            "Cameroon",
            "Central African Republic",
            "Chad",
            "Comoros",
            "Republic of the Congo",
            "Democratic Republic of the Congo",
            "Côte d'Ivoire",
            "Djibouti",
            "Egypt",
            "Equatorial Guinea",
            "Eritrea",
            "Eswatini",
            "Ethiopia",
            "Gabon",
            "Gambia",
            "Ghana",
            "Guinea",
            "Guinea-Bissau",
            "Kenya",
            "Lesotho",
            "Liberia",
            "Libya",
            "Madagascar",
            "Malawi",
            "Mali",
            "Mauritania",
            "Mauritius",
            "Morocco",
            "Mozambique",
            "Namibia",
            "Niger",
            "Nigeria",
            "Rwanda",
            "São Tomé and Príncipe",
            "Senegal",
            "Seychelles",
            "Sierra Leone",
            "Somalia",
            "South Africa",
            "South Sudan",
            "Sudan",
            "Tanzania",
            "Togo",
            "Tunisia",
            "Uganda",
            "Zambia",
            "Zimbabwe"
        ],

        "Asia": [
            "Afghanistan",
            "Armenia",
            "Azerbaijan",
            "Bahrain",
            "Bangladesh",
            "Bhutan",
            "Brunei",
            "Cambodia",
            "China",
            "Cyprus",
            "Georgia",
            "India",
            "Indonesia",
            "Iran",
            "Iraq",
            "Israel",
            "Japan",
            "Jordan",
            "Kazakhstan",
            "Kuwait",
            "Kyrgyzstan",
            "Laos",
            "Lebanon",
            "Malaysia",
            "Maldives",
            "Mongolia",
            "Myanmar (Burma)",
            "Nepal",
            "North Korea",
            "Oman",
            "Pakistan",
            "State of Palestine",
            "Philippines",
            "Qatar",
            "Saudi Arabia",
            "Singapore",
            "South Korea",
            "Sri Lanka",
            "Syria",
            "Tajikistan",
            "Thailand",
            "Timor-Leste",
            "Türkiye (Turkey)",
            "Turkmenistan",
            "United Arab Emirates",
            "Uzbekistan",
            "Vietnam",
            "Yemen"
        ],

        "Europe": [
            "Albania",
            "Andorra",
            "Austria",
            "Belarus",
            "Belgium",
            "Bosnia and Herzegovina",
            "Bulgaria",
            "Croatia",
            "Czechia (Czech Republic)",
            "Denmark",
            "Estonia",
            "Finland",
            "France",
            "Germany",
            "Greece",
            "Holy See (Vatican City)",
            "Hungary",
            "Iceland",
            "Ireland",
            "Italy",
            "Latvia",
            "Liechtenstein",
            "Lithuania",
            "Luxembourg",
            "Malta",
            "Moldova",
            "Monaco",
            "Montenegro",
            "Netherlands",
            "North Macedonia",
            "Norway",
            "Poland",
            "Portugal",
            "Romania",
            "Russia",
            "San Marino",
            "Serbia",
            "Slovakia",
            "Slovenia",
            "Spain",
            "Sweden",
            "Switzerland",
            "Ukraine",
            "United Kingdom"
        ],

        "North America": [
            "Antigua and Barbuda",
            "Bahamas",
            "Barbados",
            "Belize",
            "Canada",
            "Costa Rica",
            "Cuba",
            "Dominica",
            "Dominican Republic",
            "El Salvador",
            "Grenada",
            "Guatemala",
            "Haiti",
            "Honduras",
            "Jamaica",
            "Mexico",
            "Nicaragua",
            "Panama",
            "Saint Kitts and Nevis",
            "Saint Lucia",
            "Saint Vincent and the Grenadines",
            "Trinidad and Tobago",
            "United States of America"
        ],

        "Oceania": [
            "Australia",
            "Fiji",
            "Kiribati",
            "Marshall Islands",
            "Micronesia (Federated States of)",
            "Nauru",
            "New Zealand",
            "Palau",
            "Papua New Guinea",
            "Samoa",
            "Solomon Islands",
            "Tonga",
            "Tuvalu",
            "Vanuatu"
        ],

        "South America": [
            "Argentina",
            "Bolivia",
            "Brazil",
            "Chile",
            "Colombia",
            "Ecuador",
            "Guyana",
            "Paraguay",
            "Peru",
            "Suriname",
            "Uruguay",
            "Venezuela"
        ]

    };


    // ============================================================
    // GET ALL COUNTRIES
    // ============================================================

    function getCountries() {

        return Object.keys(COUNTRY_MOBILE_NETWORKS);

    }


    // ============================================================
    // GET NETWORKS FOR ONE COUNTRY
    // ============================================================

    function getNetworks(country) {

        if (!country) {
            return [];
        }

        return COUNTRY_MOBILE_NETWORKS[country] || [];

    }


    // ============================================================
    // GET CONTINENTS
    // ============================================================

    function getContinents() {

        return Object.keys(
            COUNTRY_MOBILE_NETWORKS_BY_CONTINENT
        );

    }


    // ============================================================
    // GET COUNTRIES FOR A CONTINENT
    // ============================================================

    function getCountriesByContinent(continent) {

        return COUNTRY_MOBILE_NETWORKS_BY_CONTINENT[continent] || [];

    }


    // ============================================================
    // POPULATE COUNTRY SELECT
    // ============================================================

    function populateCountrySelect(select, options) {

        if (!select) {
            return;
        }

        const settings = Object.assign({

            placeholder: "Select Country",

            includeContinentGroups: true

        }, options || {});


        select.innerHTML = "";


        const placeholder =
            document.createElement("option");

        placeholder.value = "";

        placeholder.textContent =
            settings.placeholder;

        placeholder.disabled = true;

        placeholder.selected = true;

        select.appendChild(placeholder);


        if (settings.includeContinentGroups) {

            getContinents().forEach(function (continent) {

                const group =
                    document.createElement("optgroup");

                group.label = continent;


                getCountriesByContinent(continent)
                    .forEach(function (country) {

                        const option =
                            document.createElement("option");

                        option.value = country;

                        option.textContent = country;

                        group.appendChild(option);

                    });


                select.appendChild(group);

            });

        } else {

            getCountries().forEach(function (country) {

                const option =
                    document.createElement("option");

                option.value = country;

                option.textContent = country;

                select.appendChild(option);

            });

        }

    }


    // ============================================================
    // POPULATE MOBILE NETWORK SELECT
    // ============================================================

    function populateNetworkSelect(
        select,
        country,
        options
    ) {

        if (!select) {
            return;
        }


        const settings = Object.assign({

            placeholder: "Select Mobile Network",

            emptyText: "Select a country first"

        }, options || {});


        select.innerHTML = "";


        const networks =
            getNetworks(country);


        const placeholder =
            document.createElement("option");


        placeholder.value = "";


        placeholder.textContent =
            country
                ? settings.placeholder
                : settings.emptyText;


        placeholder.disabled = true;

        placeholder.selected = true;


        select.appendChild(placeholder);


        networks.forEach(function (network) {

            const option =
                document.createElement("option");


            option.value = network;

            option.textContent = network;


            select.appendChild(option);

        });


        select.disabled =
            networks.length === 0;

    }


    // ============================================================
    // INITIALISE CASCADING COUNTRY → NETWORK FORM
    // ============================================================

    function init(config) {

        config = config || {};


        const countrySelect =
            typeof config.countrySelectId === "string"

                ? document.getElementById(
                    config.countrySelectId
                )

                : config.countrySelect;


        const networkSelect =
            typeof config.networkSelectId === "string"

                ? document.getElementById(
                    config.networkSelectId
                )

                : config.networkSelect;


        if (!countrySelect ||
            !networkSelect) {

            console.error(
                "MobileNetworkForm.init: " +
                "countrySelect and networkSelect " +
                "are required."
            );

            return null;

        }


        // Populate countries.

        populateCountrySelect(
            countrySelect,
            config.countryOptions
        );


        // Initially disable networks.

        populateNetworkSelect(
            networkSelect,
            countrySelect.value,
            config.networkOptions
        );


        // When country changes,
        // replace network options.

        countrySelect.addEventListener(
            "change",
            function () {

                populateNetworkSelect(
                    networkSelect,
                    countrySelect.value,
                    config.networkOptions
                );


                if (
                    typeof config.onCountryChange ===
                    "function"
                ) {

                    config.onCountryChange(
                        countrySelect.value,
                        getNetworks(
                            countrySelect.value
                        )
                    );

                }

            }
        );


        // When network changes.

        networkSelect.addEventListener(
            "change",
            function () {

                if (
                    typeof config.onNetworkChange ===
                    "function"
                ) {

                    config.onNetworkChange(

                        countrySelect.value,

                        networkSelect.value

                    );

                }

            }
        );


        return {

            countrySelect:
                countrySelect,

            networkSelect:
                networkSelect

        };

    }


    // ============================================================
    // VALIDATE DATASET
    // ============================================================

    function validate() {

        const countries =
            getCountries();


        const uniqueCountries =
            new Set(countries);


        const continentCounts = {};


        getContinents().forEach(
            function (continent) {

                continentCounts[continent] =
                    getCountriesByContinent(
                        continent
                    ).length;

            }
        );


        return {

            valid:
                countries.length === 195 &&
                uniqueCountries.size === 195,

            countryCount:
                countries.length,

            continentCounts:
                continentCounts

        };

    }


    // ============================================================
    // SEARCH COUNTRIES
    // ============================================================

    function searchCountries(query) {

        const q =
            String(query || "")
                .trim()
                .toLowerCase();


        if (!q) {
            return [];
        }


        return getCountries()
            .filter(function (country) {

                return country
                    .toLowerCase()
                    .includes(q);

            });

    }


    // ============================================================
    // SEARCH NETWORKS
    // ============================================================

    function searchNetworks(query) {

        const q =
            String(query || "")
                .trim()
                .toLowerCase();


        if (!q) {
            return [];
        }


        const results = [];


        Object.keys(
            COUNTRY_MOBILE_NETWORKS
        ).forEach(function (country) {

            COUNTRY_MOBILE_NETWORKS[country]
                .forEach(function (network) {

                    if (
                        network
                            .toLowerCase()
                            .includes(q)
                    ) {

                        results.push({

                            country: country,

                            network: network

                        });

                    }

                });

        });


        return results;

    }


    // ============================================================
    // EXPOSE DATA TO THE APP
    // ============================================================

    window.COUNTRY_MOBILE_NETWORKS =
        COUNTRY_MOBILE_NETWORKS;


    window.COUNTRY_MOBILE_NETWORKS_BY_CONTINENT =
        COUNTRY_MOBILE_NETWORKS_BY_CONTINENT;


    // ============================================================
    // EXPOSE API
    // ============================================================

    window.MobileNetworkForm = {

        init:
            init,

        getCountries:
            getCountries,

        getNetworks:
            getNetworks,

        getContinents:
            getContinents,

        getCountriesByContinent:
            getCountriesByContinent,

        populateCountrySelect:
            populateCountrySelect,

        populateNetworkSelect:
            populateNetworkSelect,

        searchCountries:
            searchCountries,

        searchNetworks:
            searchNetworks,

        validate:
            validate

    };


})(window);