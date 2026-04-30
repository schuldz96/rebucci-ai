const countryCodeMap = {
    "1": "us",
    "7": "ru",
    "20": "eg",
    "27": "za",
    "30": "gr",
    "31": "nl",
    "32": "be",
    "33": "fr",
    "34": "es",
    "36": "hu",
    "39": "it",
    "40": "ro",
    "41": "ch",
    "43": "at",
    "44": "gb",
    "45": "dk",
    "46": "se",
    "47": "no",
    "48": "pl",
    "49": "de",
    "51": "pe",
    "52": "mx",
    "53": "cu",
    "54": "ar",
    "55": "br",
    "56": "cl",
    "57": "co",
    "58": "ve",
    "60": "my",
    "61": "au",
    "62": "id",
    "63": "ph",
    "64": "nz",
    "65": "sg",
    "66": "th",
    "81": "jp",
    "82": "kr",
    "84": "vn",
    "86": "cn",
    "90": "tr",
    "91": "in",
    "92": "pk",
    "93": "af",
    "94": "lk",
    "95": "mm",
    "98": "ir",
    "211": "ss",
    "212": "ma",
    "213": "dz",
    "216": "tn",
    "218": "ly",
    "220": "gm",
    "221": "sn",
    "222": "mr",
    "223": "ml",
    "224": "gn",
    "225": "ci",
    "226": "bf",
    "227": "ne",
    "228": "tg",
    "229": "bj",
    "230": "mu",
    "231": "lr",
    "232": "sl",
    "233": "gh",
    "234": "ng",
    "235": "td",
    "236": "cf",
    "237": "cm",
    "238": "cv",
    "239": "st",
    "240": "gq",
    "241": "ga",
    "242": "cg",
    "243": "cd",
    "244": "ao",
    "245": "gw",
    "246": "io",
    "248": "sc",
    "249": "sd",
    "250": "rw",
    "251": "et",
    "252": "so",
    "253": "dj",
    "254": "ke",
    "255": "tz",
    "256": "ug",
    "257": "bi",
    "258": "mz",
    "260": "zm",
    "261": "mg",
    "262": "re",
    "263": "zw",
    "264": "na",
    "265": "mw",
    "266": "ls",
    "267": "bw",
    "268": "sz",
    "269": "km",
    "290": "sh",
    "291": "er",
    "297": "aw",
    "298": "fo",
    "299": "gl",
    "350": "gi",
    "351": "pt",
    "352": "lu",
    "353": "ie",
    "354": "is",
    "355": "al",
    "356": "mt",
    "357": "cy",
    "358": "fi",
    "359": "bg",
    "370": "lt",
    "371": "lv",
    "372": "ee",
    "373": "md",
    "374": "am",
    "375": "by",
    "376": "ad",
    "377": "mc",
    "378": "sm",
    "379": "va",
    "380": "ua",
    "381": "rs",
    "382": "me",
    "383": "xk",
    "385": "hr",
    "386": "si",
    "387": "ba",
    "389": "mk",
    "420": "cz",
    "421": "sk",
    "423": "li",
    "500": "fk",
    "501": "bz",
    "502": "gt",
    "503": "sv",
    "504": "hn",
    "505": "ni",
    "506": "cr",
    "507": "pa",
    "508": "pm",
    "509": "ht",
    "590": "gp",
    "591": "bo",
    "592": "gy",
    "593": "ec",
    "594": "gf",
    "595": "py",
    "596": "mq",
    "597": "sr",
    "598": "uy",
    "599": "cw",
    "670": "tl",
    "672": "nf",
    "673": "bn",
    "674": "nr",
    "675": "pg",
    "676": "to",
    "677": "sb",
    "678": "vu",
    "679": "fj",
    "680": "pw",
    "681": "wf",
    "682": "ck",
    "683": "nu",
    "685": "ws",
    "686": "ki",
    "687": "nc",
    "688": "tv",
    "689": "pf",
    "690": "tk",
    "691": "fm",
    "692": "mh",
    "850": "kp",
    "852": "hk",
    "853": "mo",
    "855": "kh",
    "856": "la",
    "880": "bd",
    "886": "tw",
    "960": "mv",
    "961": "lb",
    "962": "jo",
    "963": "sy",
    "964": "iq",
    "965": "kw",
    "966": "sa",
    "967": "ye",
    "968": "om",
    "970": "ps",
    "971": "ae",
    "972": "il",
    "973": "bh",
    "974": "qa",
    "975": "bt",
    "976": "mn",
    "977": "np",
    "992": "tj",
    "993": "tm",
    "994": "az",
    "995": "ge",
    "996": "kg",
    "998": "uz"
};

const maxlengthClass = "text-xs font-bold py-0.5 mt-2 px-2 bg-gray-100 text-gray-500 rounded";
const limitReachedClass = "text-xs font-bold py-0.5 mt-2 px-2 bg-primary-100 text-primary-500 rounded";

const il8n = {
    // Country names
    ad: "Andorra",
    ae: "Emirados Árabes Unidos",
    af: "Afeganistão",
    ag: "Antígua e Barbuda",
    ai: "Anguila",
    al: "Albânia",
    am: "Armênia",
    ao: "Angola",
    aq: "Antártida",
    ar: "Argentina",
    as: "Samoa Americana",
    at: "Áustria",
    au: "Austrália",
    aw: "Aruba",
    ax: "Ilhas Aland",
    az: "Azerbaijão",
    ba: "Bósnia e Herzegovina",
    bb: "Barbados",
    bd: "Bangladesh",
    be: "Bélgica",
    bf: "Burquina Faso",
    bg: "Bulgária",
    bh: "Bahrein",
    bi: "Burundi",
    bj: "Benin",
    bl: "São Bartolomeu",
    bm: "Bermudas",
    bn: "Brunei",
    bo: "Bolívia",
    bq: "Países Baixos Caribenhos",
    br: "Brasil",
    bs: "Bahamas",
    bt: "Butão",
    bv: "Ilha Bouvet",
    bw: "Botsuana",
    by: "Bielorrússia",
    bz: "Belize",
    ca: "Canadá",
    cc: "Ilhas Cocos (Keeling)",
    cd: "Congo - Kinshasa",
    cf: "República Centro-Africana",
    cg: "República do Congo",
    ch: "Suíça",
    ci: "Costa do Marfim",
    ck: "Ilhas Cook",
    cl: "Chile",
    cm: "Camarões",
    cn: "China",
    co: "Colômbia",
    cr: "Costa Rica",
    cu: "Cuba",
    cv: "Cabo Verde",
    cw: "Curaçao",
    cx: "Ilha Christmas",
    cy: "Chipre",
    cz: "Tchéquia",
    de: "Alemanha",
    dj: "Djibuti",
    dk: "Dinamarca",
    dm: "Dominica",
    do: "República Dominicana",
    dz: "Argélia",
    ec: "Equador",
    ee: "Estônia",
    eg: "Egito",
    eh: "Saara Ocidental",
    er: "Eritreia",
    es: "Espanha",
    et: "Etiópia",
    fi: "Finlândia",
    fj: "Fiji",
    fk: "Ilhas Malvinas",
    fm: "Micronésia",
    fo: "Ilhas Faroe",
    fr: "França",
    ga: "Gabão",
    gb: "Reino Unido",
    gd: "Granada",
    ge: "Geórgia",
    gf: "Guiana Francesa",
    gg: "Guernsey",
    gh: "Gana",
    gi: "Gibraltar",
    gl: "Groenlândia",
    gm: "Gâmbia",
    gn: "Guiné",
    gp: "Guadalupe",
    gq: "Guiné Equatorial",
    gr: "Grécia",
    gs: "Ilhas Geórgia do Sul e Sandwich do Sul",
    gt: "Guatemala",
    gu: "Guam",
    gw: "Guiné-Bissau",
    gy: "Guiana",
    hk: "Hong Kong, RAE da China",
    hm: "Ilhas Heard e McDonald",
    hn: "Honduras",
    hr: "Croácia",
    ht: "Haiti",
    hu: "Hungria",
    id: "Indonésia",
    ie: "Irlanda",
    il: "Israel",
    im: "Ilha de Man",
    in: "Índia",
    io: "Território Britânico do Oceano Índico",
    iq: "Iraque",
    ir: "Irã",
    is: "Islândia",
    it: "Itália",
    je: "Jersey",
    jm: "Jamaica",
    jo: "Jordânia",
    jp: "Japão",
    ke: "Quênia",
    kg: "Quirguistão",
    kh: "Camboja",
    ki: "Quiribati",
    km: "Comores",
    kn: "São Cristóvão e Névis",
    kp: "Coreia do Norte",
    kr: "Coreia do Sul",
    kw: "Kuwait",
    ky: "Ilhas Cayman",
    kz: "Cazaquistão",
    la: "Laos",
    lb: "Líbano",
    lc: "Santa Lúcia",
    li: "Liechtenstein",
    lk: "Sri Lanka",
    lr: "Libéria",
    ls: "Lesoto",
    lt: "Lituânia",
    lu: "Luxemburgo",
    lv: "Letônia",
    ly: "Líbia",
    ma: "Marrocos",
    mc: "Mônaco",
    md: "Moldova",
    me: "Montenegro",
    mf: "São Martinho",
    mg: "Madagascar",
    mh: "Ilhas Marshall",
    mk: "Macedônia do Norte",
    ml: "Mali",
    mm: "Mianmar (Birmânia)",
    mn: "Mongólia",
    mo: "Macau, RAE da China",
    mp: "Ilhas Marianas do Norte",
    mq: "Martinica",
    mr: "Mauritânia",
    ms: "Montserrat",
    mt: "Malta",
    mu: "Maurício",
    mv: "Maldivas",
    mw: "Malaui",
    mx: "México",
    my: "Malásia",
    mz: "Moçambique",
    na: "Namíbia",
    nc: "Nova Caledônia",
    ne: "Níger",
    nf: "Ilha Norfolk",
    ng: "Nigéria",
    ni: "Nicarágua",
    nl: "Países Baixos",
    no: "Noruega",
    np: "Nepal",
    nr: "Nauru",
    nu: "Niue",
    nz: "Nova Zelândia",
    om: "Omã",
    pa: "Panamá",
    pe: "Peru",
    pf: "Polinésia Francesa",
    pg: "Papua-Nova Guiné",
    ph: "Filipinas",
    pk: "Paquistão",
    pl: "Polônia",
    pm: "São Pedro e Miquelão",
    pn: "Ilhas Pitcairn",
    pr: "Porto Rico",
    ps: "Territórios palestinos",
    pt: "Portugal",
    pw: "Palau",
    py: "Paraguai",
    qa: "Catar",
    re: "Reunião",
    ro: "Romênia",
    rs: "Sérvia",
    ru: "Rússia",
    rw: "Ruanda",
    sa: "Arábia Saudita",
    sb: "Ilhas Salomão",
    sc: "Seicheles",
    sd: "Sudão",
    se: "Suécia",
    sg: "Singapura",
    sh: "Santa Helena",
    si: "Eslovênia",
    sj: "Svalbard e Jan Mayen",
    sk: "Eslováquia",
    sl: "Serra Leoa",
    sm: "San Marino",
    sn: "Senegal",
    so: "Somália",
    sr: "Suriname",
    ss: "Sudão do Sul",
    st: "São Tomé e Príncipe",
    sv: "El Salvador",
    sx: "Sint Maarten",
    sy: "Síria",
    sz: "Essuatíni",
    tc: "Ilhas Turcas e Caicos",
    td: "Chade",
    tf: "Territórios Franceses do Sul",
    tg: "Togo",
    th: "Tailândia",
    tj: "Tadjiquistão",
    tk: "Tokelau",
    tl: "Timor-Leste",
    tm: "Turcomenistão",
    tn: "Tunísia",
    to: "Tonga",
    tr: "Turquia",
    tt: "Trinidad e Tobago",
    tv: "Tuvalu",
    tw: "Taiwan",
    tz: "Tanzânia",
    ua: "Ucrânia",
    ug: "Uganda",
    um: "Ilhas Menores Distantes dos EUA",
    us: "Estados Unidos",
    uy: "Uruguai",
    uz: "Uzbequistão",
    va: "Cidade do Vaticano",
    vc: "São Vicente e Granadinas",
    ve: "Venezuela",
    vg: "Ilhas Virgens Britânicas",
    vi: "Ilhas Virgens Americanas",
    vn: "Vietnã",
    vu: "Vanuatu",
    wf: "Wallis e Futuna",
    ws: "Samoa",
    ye: "Iêmen",
    yt: "Mayotte",
    za: "África do Sul",
    zm: "Zâmbia",
    zw: "Zimbábue",
    // Aria label for the selected country element
    selectedCountryAriaLabel: "País selecionado",
    // Screen reader text for when no country is selected
    noCountrySelected: "Nenhum país selecionado",
    // Aria label for the country list element
    countryListAriaLabel: "Lista de países",
    // Placeholder for the search input in the dropdown
    searchPlaceholder: "Buscar",
    // Screen reader text for when the search produces no results
    zeroSearchResults: "Nenhum resultado encontrado",
    // Screen reader text for when the search produces 1 result
    oneSearchResult: "1 resultado encontrado",
    // Screen reader text for when the search produces multiple results, where ${count} will be replaced by the count
    multipleSearchResults: "${count} resultados encontrados",
};

function loading(show) {
    var block = document.getElementById("page-loader");
    if (show) {
        block.classList.add("active");
    } else {
        block.classList.remove("active");
    }
}

function returnRadioValue(name) {
    var ele = document.getElementsByName(name);

    for (i = 0; i < ele.length; i++) {
        if (ele[i].checked) {
            return ele[i].value;
        }
    }
    return '';
}

function returnCheckedCheckbox(id) {
    if (document.querySelector(id).checked) {
        return 'Sim';
    } else {
        return 'Não';
    }
}

function returnCheckedCheckboxInt(id) {
    if (document.querySelector(id).checked) {
        return '1';
    } else {
        return '0';
    }
}

function isNumberKey(evt, obj, dot = false) {
    var charCode = (evt.which) ? evt.which : event.keyCode
    var value = obj.value;

    // Verifica se o ponto é o primeiro caractere
    if (dot && charCode == 46 && value.length === 0) {
        return false;
    }

    if (dot) {
        var dotcontains = value.indexOf(".") != -1;
        if (dotcontains)
            if (charCode == 46) return false;
        if (charCode == 46) return true;
    }

    if (charCode > 31 && (charCode < 48 || charCode > 57))
        return false;
    return true;
}

function handleKeyPress(evt, element) {
    if (evt.keyCode === 13) {
        if ('blur' in element) element.blur();
    } else {
        return isNumberKey(evt, element, true);
    }
}

function preventEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
    }
}

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function moeda(a, e, r, t) {
    let n = "",
        h = j = 0,
        u = tamanho2 = 0,
        l = ajd2 = "",
        o = window.Event ? t.which : t.keyCode;
    if (13 == o || 8 == o)
        return !0;
    if (n = String.fromCharCode(o), -1 == "0123456789".indexOf(n))
        return !1;
    for (u = a.value.length,
        h = 0; h < u && ("0" == a.value.charAt(h) || a.value.charAt(h) == r); h++)
    ;
    for (l = ""; h < u; h++)
        -
        1 != "0123456789".indexOf(a.value.charAt(h)) && (l += a.value.charAt(h));
    if (l += n,
        0 == (u = l.length) && (a.value = ""),
        1 == u && (a.value = "0" + r + "0" + l),
        2 == u && (a.value = "0" + r + l),
        u > 2) {
        for (ajd2 = "",
            j = 0,
            h = u - 3; h >= 0; h--)
            3 == j && (ajd2 += e,
                j = 0),
            ajd2 += l.charAt(h),
            j++;
        for (a.value = "",
            tamanho2 = ajd2.length,
            h = tamanho2 - 1; h >= 0; h--)
            a.value += ajd2.charAt(h);
        a.value += r + l.substr(u - 2, u)
    }
    return !1
}

function validaSocial(req, el, focusin = true) {
    switch (req) {
        case '@':
            if (focusin) {
                if (el.value == '') {
                    el.value = '@';
                }
            } else {
                if (el.value == '@') {
                    el.value = '';
                }
            }
            break;

        case '/':
            if (focusin) {
                if (el.value == '') {
                    el.value = '/';
                }
            } else {
                if (el.value == '/') {
                    el.value = '';
                }
            }
            break;

        case '55':
            if (focusin) {
                if (el.value == '') {
                    el.value = '55';
                }
            } else {
                if (el.value == '55') {
                    el.value = '';
                }
            }
            break;

        default:
            Swal.fire({
                title: 'Erro',
                text: 'Erro interno',
                icon: 'error'
            });
            break;
    }
}

function phoneMask() {
    function inputHandler(masks, max, event) {
        var c = event.target;
        var v = c.value.replace(/\D/g, '');
        var m = c.value.length > max ? 1 : 0;
        VMasker(c).unMask();
        VMasker(c).maskPattern(masks[m]);
        c.value = VMasker.toPattern(v, masks[m]);
    }

    var telMask = ['(99) 9999-99999', '(99) 99999-9999'];
    var tel = document.querySelector('input[attrname=telefone]');
    VMasker(tel).maskPattern(telMask[0]);
    tel.addEventListener('input', inputHandler.bind(undefined, telMask, 14), false);
}

function formatPhoneNumber(input, iti) {
    const countryData = iti.getSelectedCountryData();
    const phoneNumber = input.value.replace(/\D/g, ''); // Remove non-numeric characters

    let pattern;
    if (countryData.iso2 === 'br') {
        pattern = phoneNumber.length === 11 ? "99 99999-9999" : "99 9999-9999";
    } else {
        if (typeof intlTelInputUtils !== 'undefined') {
            const exampleNumber = intlTelInput.utils.getExampleNumber(countryData.iso2, true, intlTelInput.utils.numberType.FIXED_LINE);
            pattern = exampleNumber ? exampleNumber.replace(/\d/g, '9') : null;
        } else {
            pattern = null;
        }
    }

    if (pattern) {
        input.value = VMasker.toPattern(phoneNumber, pattern);
    }
}

function validaElementExists(element) {
    if (element) {
        return element.value;
    } else {
        return '';
    }
}

// CAPTAÇÃO
function validaLink() {
    if (document.querySelector("#link-captacao").value == '') {
        Swal.fire({
            title: 'Atenção',
            text: 'Selecione uma das opções antes de copiar.',
            icon: 'warning'
        });
        return;
    }
    copyToClipBoard(document.querySelector('#link-captacao'));
    toggleModal('modal-captacao', false);
    document.querySelector('#form-captacao').reset();
}

function closeModalCaptacao() {
    document.querySelector('#form-captacao').reset();

    if (document.querySelector("#li-captacao-clientes")) {
        document.querySelector("#li-captacao-clientes").classList.add("hidden");
    }

    toggleModal('modal-captacao', false);
}

if ($('.select2').length) {
    $('.select2').select2({
        theme: "default",
        placeholder: "Selecione uma opção"
    });
}

function copyToClipBoard(copyText) {
    var tempInput = document.createElement("textarea");
    tempInput.style.position = "absolute";
    tempInput.style.left = "-9999px";
    tempInput.value = copyText;
    document.body.appendChild(tempInput);

    tempInput.select();
    tempInput.setSelectionRange(0, 99999); // Para dispositivos móveis

    document.execCommand("copy");
    document.body.removeChild(tempInput);
}

function disableSelectedRadioButton() {
    var selectedRadio = document.querySelector('input[name="posicao"]:checked');
    if (selectedRadio) {
        selectedRadio.disabled = true;
        var customCheckmark = selectedRadio.nextElementSibling;
        if (customCheckmark.classList.contains('custom_checkmark')) {
            customCheckmark.classList.add('disabled');
        }
    }
}

function togglePicContainer(show = true) {
    var button = document.querySelector("#togglePicButton");
    var container = document.querySelector(".div_ck_foto_container");

    if (show) {
        container.classList.remove('hidden');
        button.innerHTML = "Ocultar fotos comparativas";
        button.onclick = function() {
            togglePicContainer(false);
        };
    } else {
        container.classList.add('hidden');
        button.innerHTML = "Exibir fotos comparativas";
        button.onclick = function() {
            togglePicContainer();
        };
    }
}

function validateVideoUrl(url) {
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }

    const patterns = {
        youtube: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|shorts\/)?([a-zA-Z0-9_-]{11})$/,
        vimeo: /^(https?:\/\/)?(www\.)?(vimeo\.com)\/([0-9]+)(?:\/([a-zA-Z0-9]+))?$/
    };

    for (const [platform, pattern] of Object.entries(patterns)) {
        const match = url.match(pattern);
        if (match) {
            const result = {
                isValid: true,
                platform: platform,
                videoId: match[5] || match[4]
            };
            // Para Vimeo com hash de privacidade
            if (platform === 'vimeo' && match[5]) {
                result.videoId = match[4];
                result.hash = match[5];
            }
            return result;
        }
    }

    return {
        isValid: false
    };
}

function extractVideoId(url) {
    const result = validateVideoUrl(url);
    return result.isValid ? result.videoId : null;
}

function updateCounter(inputId, counterId) {
    const input = document.getElementById(inputId) ? ? null;

    if (!input) {
        return;
    }

    const counter = document.getElementById(counterId);
    const maxLength = input.getAttribute('maxlength');

    input.addEventListener('input', function() {
        counter.textContent = `${input.value.length}/${maxLength}`;
    });

    counter.textContent = `${input.value.length}/${maxLength}`;
}

function validateMaxLength() {
    const inputs = document.querySelectorAll('input[maxlength], textarea[maxlength]');
    for (const input of inputs) {
        const maxLength = input.getAttribute('maxlength');
        if (input.value.length > maxLength) {
            Swal.fire({
                title: 'Limite excedido',
                text: `O campo ultrapassou o limite de caracteres permitidos: ${maxLength} caracteres.`,
                icon: 'error'
            });
            input.focus();
            return false;
        }
    }
    return true;
}

function setupDeleteLinks(deleteLinks) {
    deleteLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            handleDeleteLinkClick(this);
        });
    });
}

function handleDeleteLinkClick(link) {
    const id = link.getAttribute('data-id');

    Swal.fire({
        title: 'Confirmar exclusão',
        text: 'Tem certeza que deseja excluir este item?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6'
    }).then((result) => {
        if (result.isConfirmed) {
            deleteItem(id);
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    if (typeof Swal !== 'undefined') {
        setupSwalDefaults();
    } else {
        setTimeout(setupSwalDefaults, 100);
    }

    function setupSwalDefaults() {
        const originalFire = Swal.fire;

        Swal.fire = function(options, ...args) {
            if (typeof options === 'string') {
                if (args.length === 0) {
                    options = {
                        title: options
                    };
                } else if (args.length === 1 && typeof args[0] === 'string') {
                    options = {
                        title: options,
                        text: args[0]
                    };
                    args = [];
                } else if (args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string') {
                    options = {
                        title: options,
                        text: args[0],
                        icon: args[1]
                    };
                    args = [];
                }
            }

            if (!options || typeof options !== 'object') {
                options = {};
            }

            const defaultConfig = {
                confirmButtonColor: '#3D96FF',
                cancelButtonColor: '#667085',
                buttonsStyling: true,
                customClass: {
                    popup: 'rounded-lg',
                    confirmButton: 'swal2-confirm-custom',
                    cancelButton: 'swal2-cancel-custom'
                }
            };

            const finalOptions = Object.assign({}, defaultConfig, options);

            if (!options.hasOwnProperty('confirmButtonColor')) {
                finalOptions.confirmButtonColor = '#3D96FF';
            }
            if (!options.hasOwnProperty('cancelButtonColor')) {
                finalOptions.cancelButtonColor = '#667085';
            }

            return originalFire.call(this, finalOptions, ...args);
        };

        Object.setPrototypeOf(Swal, originalFire);
        Object.assign(Swal, originalFire);
    }
});

$(document).ready(function() {
    Inputmask().mask(document.querySelectorAll("input"));
});