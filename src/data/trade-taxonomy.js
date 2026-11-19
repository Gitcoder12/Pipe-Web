/* Pipe-Web trade taxonomy.
 * Goods: UN Comtrade HS 2022 (H6) chapter codes.
 * Services: UN Comtrade EBOPS 2010 (EB10) hierarchy.
 * Labels follow the published classifications; group headings are UI navigation only.
 */
(() => {
  "use strict";
  const chapter = (code, label) => ({ code, label });
  const goods = [
    { id:"food", label:"Agriculture, food & beverages", defaultChild:"10", chapters:[
      chapter("01","Live animals"),
      chapter("02","Meat and edible meat offal"),
      chapter("03","Fish, crustaceans and aquatic invertebrates"),
      chapter("04","Dairy produce, eggs and honey"),
      chapter("05","Other animal products"),
      chapter("06","Live trees and other plants"),
      chapter("07","Edible vegetables"),
      chapter("08","Edible fruit and nuts"),
      chapter("09","Coffee, tea, mate and spices"),
      chapter("10","Cereals"),
      chapter("11","Products of the milling industry"),
      chapter("12","Oil seeds and oleaginous fruits"),
      chapter("13","Lac, gums, resins and vegetable saps"),
      chapter("14","Vegetable plaiting materials"),
      chapter("15","Animal or vegetable fats and oils"),
      chapter("16","Preparations of meat, fish or crustaceans"),
      chapter("17","Sugars and sugar confectionery"),
      chapter("18","Cocoa and cocoa preparations"),
      chapter("19","Preparations of cereals, flour, starch or milk"),
      chapter("20","Preparations of vegetables, fruit or nuts"),
      chapter("21","Miscellaneous edible preparations"),
      chapter("22","Beverages, spirits and vinegar"),
      chapter("23","Food-industry residues and animal fodder"),
      chapter("24","Tobacco and manufactured tobacco substitutes")
    ]},
    { id:"energy", label:"Minerals & energy", defaultChild:"27", chapters:[
      chapter("25","Salt, sulfur, earths, stone, lime and cement"),
      chapter("26","Ores, slag and ash"),
      chapter("27","Mineral fuels, mineral oils and waxes")
    ]},
    { id:"chemicals", label:"Chemicals & pharmaceuticals", defaultChild:"30", chapters:[
      chapter("28","Inorganic chemicals"),
      chapter("29","Organic chemicals"),
      chapter("30","Pharmaceutical products"),
      chapter("31","Fertilizers"),
      chapter("32","Tanning or dyeing extracts, pigments and paints"),
      chapter("33","Essential oils, perfumery and cosmetics"),
      chapter("34","Soap, detergents, lubricants and cleaning preparations"),
      chapter("35","Albuminoidal substances, modified starches and glues"),
      chapter("36","Explosives, pyrotechnic products and matches"),
      chapter("37","Photographic or cinematographic goods"),
      chapter("38","Miscellaneous chemical products")
    ]},
    { id:"polymers", label:"Plastics, rubber & leather", defaultChild:"39", chapters:[
      chapter("39","Plastics and articles thereof"),
      chapter("40","Rubber and articles thereof"),
      chapter("41","Raw hides, skins and leather"),
      chapter("42","Articles of leather and travel goods"),
      chapter("43","Furskins and artificial fur")
    ]},
    { id:"wood-paper", label:"Wood, paper & printed products", defaultChild:"48", chapters:[
      chapter("44","Wood and articles of wood"),
      chapter("45","Cork and articles of cork"),
      chapter("46","Manufactures of straw and plaiting materials"),
      chapter("47","Wood pulp and recovered paper"),
      chapter("48","Paper, paperboard and articles thereof"),
      chapter("49","Printed books, newspapers and other printed matter")
    ]},
    { id:"textiles", label:"Textiles, apparel & footwear", defaultChild:"61", chapters:[
      chapter("50","Silk"),
      chapter("51","Wool and animal hair"),
      chapter("52","Cotton"),
      chapter("53","Other vegetable textile fibres"),
      chapter("54","Man-made filaments"),
      chapter("55","Man-made staple fibres"),
      chapter("56","Wadding, felt, nonwovens and cordage"),
      chapter("57","Carpets and other textile floor coverings"),
      chapter("58","Special woven fabrics and embroidery"),
      chapter("59","Impregnated, coated or laminated textiles"),
      chapter("60","Knitted or crocheted fabrics"),
      chapter("61","Apparel and clothing accessories, knitted or crocheted"),
      chapter("62","Apparel and clothing accessories, not knitted"),
      chapter("63","Made-up textile articles"),
      chapter("64","Footwear, gaiters and parts thereof"),
      chapter("65","Headgear and parts thereof"),
      chapter("66","Umbrellas, walking-sticks and parts"),
      chapter("67","Prepared feathers, artificial flowers and human-hair articles")
    ]},
    { id:"stone-glass", label:"Stone, glass & precious materials", defaultChild:"71", chapters:[
      chapter("68","Articles of stone, plaster, cement and similar materials"),
      chapter("69","Ceramic products"),
      chapter("70","Glass and glassware"),
      chapter("71","Natural or cultured pearls, precious stones and precious metals")
    ]},
    { id:"metals", label:"Metals & metal products", defaultChild:"72", chapters:[
      chapter("72","Iron and steel"),
      chapter("73","Articles of iron or steel"),
      chapter("74","Copper and articles thereof"),
      chapter("75","Nickel and articles thereof"),
      chapter("76","Aluminium and articles thereof"),
      chapter("78","Lead and articles thereof"),
      chapter("79","Zinc and articles thereof"),
      chapter("80","Tin and articles thereof"),
      chapter("81","Other base metals and cermets"),
      chapter("82","Tools, implements, cutlery and parts"),
      chapter("83","Miscellaneous articles of base metal")
    ]},
    { id:"machinery", label:"Machinery, electronics & electrical", defaultChild:"85", chapters:[
      chapter("84","Nuclear reactors, boilers, machinery and mechanical appliances"),
      chapter("85","Electrical machinery, electronics and sound or television equipment")
    ]},
    { id:"transport", label:"Transport equipment", defaultChild:"87", chapters:[
      chapter("86","Railway or tramway locomotives and rolling stock"),
      chapter("87","Vehicles other than railway or tramway rolling stock"),
      chapter("88","Aircraft, spacecraft and parts thereof"),
      chapter("89","Ships, boats and floating structures")
    ]},
    { id:"instruments", label:"Instruments, medical & precision goods", defaultChild:"90", chapters:[
      chapter("90","Optical, photographic, measuring and medical instruments"),
      chapter("91","Clocks and watches"),
      chapter("92","Musical instruments and parts")
    ]},
    { id:"manufactured", label:"Other manufactured goods", defaultChild:"94", chapters:[
      chapter("93","Arms and ammunition"),
      chapter("94","Furniture, bedding, lighting and prefabricated buildings"),
      chapter("95","Toys, games and sporting goods"),
      chapter("96","Miscellaneous manufactured articles"),
      chapter("97","Works of art, collectors' pieces and antiques")
    ]}
  ];

  const service = (code, label) => ({ code, label });
  const services = [
    { id:"manufacturing", code:"1", label:"Manufacturing services on physical inputs owned by others", defaultChild:"1", children:[
      service("1.1","Goods for processing in the reporting economy"),
      service("1.2","Goods for processing abroad")
    ]},
    { id:"repair", code:"2", label:"Maintenance and repair services n.i.e.", defaultChild:"2", children:[] },
    { id:"transport", code:"3", label:"Transport", defaultChild:"3.1", children:[
      service("3.1","Sea transport"),
      service("3.1.1","Passenger"),
      service("3.1.2","Freight"),
      service("3.1.3","Other"),
      service("3.2","Air transport"),
      service("3.2.1","Passenger"),
      service("3.2.2","Freight"),
      service("3.2.3","Other"),
      service("3.3","Other modes of transport"),
      service("3.3.1","Passenger"),
      service("3.3.2","Freight"),
      service("3.3.3","Other"),
      service("3.4","Postal and courier services"),
      service("3.5","Space transport"),
      service("3.6","Rail transport"),
      service("3.6.1","Passenger"),
      service("3.6.2","Freight"),
      service("3.6.3","Other"),
      service("3.7","Road transport"),
      service("3.7.1","Passenger"),
      service("3.7.2","Freight"),
      service("3.7.3","Other"),
      service("3.8","Inland waterway transport"),
      service("3.8.1","Passenger"),
      service("3.8.2","Freight"),
      service("3.8.3","Other"),
      service("3.9","Pipeline transport"),
      service("3.10","Electricity transmission"),
      service("3.11","Other supporting and auxiliary transport services")
    ]},
    { id:"travel", code:"4", label:"Travel", defaultChild:"4", children:[
      service("4.1","Business travel"),
      service("4.1.1","Business travel — border and seasonal workers"),
      service("4.1.2","Business travel — other"),
      service("4.2","Personal travel"),
      service("4.2.1","Personal travel — health-related"),
      service("4.2.2","Personal travel — education-related"),
      service("4.2.3","Personal travel — other")
    ]},
    { id:"construction", code:"5", label:"Construction services", defaultChild:"5", children:[
      service("5.1","Construction abroad"),
      service("5.2","Construction in the reporting economy")
    ]},
    { id:"insurance", code:"6", label:"Insurance and pension services", defaultChild:"6", children:[
      service("6.1","Direct insurance"),service("6.1.1","Life insurance"),service("6.1.2","Freight insurance"),service("6.1.3","Other direct insurance"),service("6.2","Reinsurance"),service("6.3","Auxiliary insurance services"),service("6.4","Pension and standardized guarantee services"),service("6.4.1","Pension services"),service("6.4.2","Standardized guarantee services")
    ] },
    { id:"finance", code:"7", label:"Financial services", defaultChild:"7", children:[service("7.1","Explicitly charged and other financial services"),service("7.2","Financial intermediation services indirectly measured (FISIM)") ] },
    { id:"ip", code:"8", label:"Charges for use of intellectual property n.i.e.", defaultChild:"8", children:[service("8.1","Franchises and trademarks licensing fees"),service("8.2","Licences for use of research and development outcomes"),service("8.3","Licences to reproduce or distribute computer software"),service("8.4","Licences to reproduce or distribute audio-visual and related products"),service("8.4.1","Audio-visual products"),service("8.4.2","Other products")] },
    { id:"telecom-it", code:"9", label:"Telecommunications, computer and information services", defaultChild:"9", children:[service("9.1","Telecommunications services"),service("9.2","Computer services"),service("9.2.1","Computer software"),service("9.2.2","Other computer services"),service("9.3","Information services"),service("9.3.1","News agency services"),service("9.3.2","Other information services")] },
    { id:"business", code:"10", label:"Other business services", defaultChild:"10", children:[
      service("10.1","Research and development services"),service("10.1.1","Systematic research and development work"),service("10.1.1.1","Customized and non-customized research and development"),service("10.1.1.2","Sale of proprietary rights arising from research and development"),
      service("10.2","Professional and management consulting services"),
      service("10.2.1","Legal, accounting, management consulting and public relations"),
      service("10.2.2","Advertising, market research and public opinion polling"),service("10.2.2.1","Convention, trade-fair and exhibition organization"),
      service("10.3","Technical, trade-related and other business services"),
      service("10.3.1","Architectural, engineering, scientific and other technical services"),service("10.3.1.1","Architectural services"),service("10.3.1.2","Engineering services"),service("10.3.1.3","Scientific and other technical services"),
      service("10.3.2","Waste treatment, agricultural and mining services"),service("10.3.2.1","Waste treatment and de-pollution"),service("10.3.2.2","Services incidental to agriculture, forestry and fishing"),service("10.3.2.3","Services incidental to mining, and oil and gas extraction"),
      service("10.3.3","Operating leasing services"),
      service("10.3.4","Trade-related services"),
      service("10.3.5","Other business services n.i.e.")
    ]},
    { id:"personal", code:"11", label:"Personal, cultural and recreational services", defaultChild:"11", children:[
      service("11.1","Audio-visual and related services"),
      service("11.1.1","Audio-visual services"),
      service("11.1.2","Artistic related services"),
      service("11.2","Other personal, cultural and recreational services"),
      service("11.2.1","Health services"),
      service("11.2.2","Education services"),
      service("11.2.3","Heritage and recreational services"),
      service("11.2.4","Other personal services")
    ]},
    { id:"government", code:"12", label:"Government goods and services n.i.e.", defaultChild:"12", children:[
      service("12.1","Embassies and consulates"),
      service("12.2","Military units and agencies"),
      service("12.3","Other government goods and services")
    ]}
  ];

  window.PipeWebTradeTaxonomy = Object.freeze({
    goods: Object.freeze({ classification:"H6", groups: goods }),
    services: Object.freeze({ classification:"EB10", groups: services })
  });
})();
