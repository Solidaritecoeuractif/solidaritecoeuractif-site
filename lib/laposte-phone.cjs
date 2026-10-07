"use strict";
// Règles téléphoniques locales reprises de l'Assistant SCA v1.15.
// Aucune donnée n'est envoyée à un service externe. Contrôle de forme seulement.
const clean=v=>String(v??'').trim();
const key=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  function scientificPhone(raw) {
    const s=String(raw??'').trim().normalize('NFKC').replace(/^['’]\s*/,'');
    const m=s.match(/^\+?(\d+)(?:[.,](\d*))?\s*[eE]([+-]?\d+)$/);
    if(!m)return {scientific:false,value:s};
    const exponent=Number(m[3]);
    if(!Number.isInteger(exponent)||Math.abs(exponent)>20)return {scientific:true,issue:'Exposant du téléphone invalide.'};
    let digits=m[1]+(m[2]||'');const point=m[1].length+exponent;
    if(point<=0||point>15)return {scientific:true,issue:'Téléphone scientifique de longueur incohérente (15 chiffres maximum).'};
    const missing=Math.max(0,point-digits.length);
    if(missing)return {scientific:true,missing,issue:'Téléphone abrégé en E+ : '+missing+' position(s) non écrite(s). Chargez le fichier Excel d’origine ou utilisez Récupérer les téléphones ; aucun zéro ne sera ajouté.'};
    if(/[^0]/.test(digits.slice(point)))return {scientific:true,issue:'Le téléphone scientifique contient une partie décimale : source à vérifier.'};
    digits=digits.slice(0,point).replace(/^0+(?=\d)/,'');
    return {scientific:true,value:digits,note:'Notation scientifique complète développée avec les chiffres présents, sans arrondi ni zéro ajouté.'};
  }

    function country(v){
      const s=clean(v).toUpperCase(), m=s.match(/^FR-(MQ|GP|GF|RE|YT|BL|MF|PM|NC|PF|WF)$/);
      const names={CANADA:'CA','UNITED STATES':'US','USA':'US','UK':'GB','FRANCE':'FR',
        'FRANCE METROPOLITAINE':'FR','ALLEMAGNE':'DE','GERMANY':'DE','DEUTSCHLAND':'DE','ITALIE':'IT','ITALY':'IT','ITALIA':'IT'};
      return m?m[1]:(names[s]||s);
    }
    function phone(raw,iso,phoneCountryRaw=''){
      const original=clean(raw), notes=[];
      const fail=issue=>({value:original,issue,note:notes.join(' '),original,changed:false});
      if(!original)return fail('Téléphone manquant.');
      let s=original.normalize('NFKC').replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g,'')
        .replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-0x660))
        .replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-0x6f0))
        .replace(/[‐‑‒–—−]/g,'-').replace(/^['’]\s*/,'')
        .replace(/^(?:t[eé]l(?:[eé]phone)?|mobile)\s*[:.]\s*/i,'').trim();
      const sci=scientificPhone(s);
      if(sci.scientific){if(sci.issue)return fail(sci.issue);s=(s.startsWith('+')?'+':'')+sci.value;notes.push(sci.note);}
      if(/[\/;,|]/.test(s)||(s.match(/\+/g)||[]).length>1)
        return fail('Plusieurs numéros ou séparateurs ambigus : gardez un seul numéro de contact.');
      if(!/^[+\d\s().-]+$/.test(s)||(/\+/.test(s)&&!s.startsWith('+')))
        return fail('Téléphone : caractères non reconnus. Gardez un seul numéro complet.');
      const digits=s.replace(/\D/g,'');
      if(digits.length<6||digits.length>17)return fail('Téléphone trop court ou trop long : vérifiez les chiffres complets.');
      // Ces motifs contrôlent la structure générale. Ils ne garantissent pas
      // qu'un abonné possède le numéro ni qu'un transporteur l'acceptera.
      const plans={
        FR:{cc:'33',trunk:'0',re:/^[1-9]\d{8}$/,name:'France'},
        MQ:{cc:'596',trunk:'0',re:/^(?:7091\d{5}|(?:[56]9|[89]\d)\d{7})$/,name:'Martinique'},
        GP:{cc:'590',trunk:'0',re:/^(?:7090\d{5}|(?:[56]9|[89]\d)\d{7})$/,name:'Guadeloupe / Saint-Martin / Saint-Barthélemy'},
        GF:{cc:'594',trunk:'0',re:/^(?:(?:694\d|7093)\d{5}|(?:59|[89]\d)\d{7})$/,name:'Guyane'},
        RE:{cc:'262',trunk:'0',re:/^(?:709\d{6}|(?:26|[689]\d)\d{7})$/,name:'La Réunion'},
        YT:{cc:'262',trunk:'0',re:/^(?:(?:639\d|7093)\d{5}|(?:26|80|9\d)\d{7})$/,name:'Mayotte'},
        // DE: indicatif +49, préfixe national 0; fixes et mobiles de longueurs variables.
        // Contrôle de format uniquement; attribution/joignabilité non vérifiées.
        DE:{cc:'49',trunk:'0',re:/^(?=\d{5,13}$)(?:1(?:6[023]|7\d)\d{7,8}|15(?:[0-25-9]\d\d|3(?:10|33))\d{6}|32\d{9,11}|49[1-6]\d{10}|322\d{6}|49[0-7]\d{3,9}|(?:[34]0|[68]9)\d{3,13}|(?:2(?:0[1-689]|[1-3569]\d|4[0-8]|7[1-7]|8[0-7])|3(?:[3569]\d|4[0-79]|7[1-7]|8[1-8])|4(?:1[02-9]|[2-48]\d|5[0-6]|6[0-8]|7[0-79])|5(?:0[2-8]|[124-6]\d|[38][0-8]|[79][0-7])|6(?:0[02-9]|[1-358]\d|[47][0-8]|6[1-9])|7(?:0[2-8]|1[1-9]|[27][0-7]|3\d|[4-6][0-8]|8[0-5]|9[013-7])|8(?:0[2-9]|1[0-79]|2\d|3[0-46-9]|4[0-6]|5[013-9]|6[1-8]|7[0-8]|8[0-24-6])|9(?:0[6-9]|[1-4]\d|[589][0-7]|6[0-8]|7[0-467]))\d{3,12}|700\d{8}|800\d{7,12}|180\d{5,11}|18(?:1\d{5,11}|[2-9]\d{8})|(?:137[7-9]|900(?:[135]|9\d))\d{6}|13(?:7[1-6]\d\d|8)\d{4})$/,name:'Allemagne'},
        // Italie : le zéro des lignes fixes reste significatif ; contrôle de format uniquement.
        IT:{cc:'39',trunk:'',re:/^(?:0\d{5,11}|1\d{8,10}|3(?:[0-8]\d{7,10}|9\d{7,8})|(?:43|55|70)\d{8}|8\d{5}(?:\d{2,4})?)$/,name:'Italie'},
        BE:{cc:'32',trunk:'0',re:/^(?:4\d{8}|[1-9]\d{7})$/,name:'Belgique'},
        CH:{cc:'41',trunk:'0',re:/^(?:[2-9]\d{8}|8\d{11})$/,name:'Suisse'},
        CM:{cc:'237',trunk:'',re:/^(?:[26]\d{8}|88\d{6,7})$/,name:'Cameroun'},
        BJ:{cc:'229',trunk:'',re:/^(?:01\d{8}|8\d{7})$/,name:'Bénin'},
        CI:{cc:'225',trunk:'',re:/^[02]\d{9}$/,name:'Côte d’Ivoire'},
        BF:{cc:'226',trunk:'',re:/^[024-7]\d{7}$/,name:'Burkina Faso'},
        // CNA, structure NANP : NXX-NXX-XXXX (N=2..9). Le 1 peut précéder
        // un numéro complet; il est alors traité comme indicatif, sans ajout double.
        // Ce contrôle de structure ne prouve ni l'attribution ni la joignabilité.
        CA:{cc:'1',trunk:'',re:/^[2-9]\d{2}[2-9]\d{6}$/,name:'Canada'},
        US:{cc:'1',trunk:'',re:/^[2-9]\d{2}[2-9]\d{6}$/,name:'États-Unis'}
      };
      plans.MF=plans.GP;plans.BL=plans.GP;
      const aliases={france:'FR','france metropolitaine':'FR',martinique:'MQ',guadeloupe:'GP',
        canada:'CA','etats unis':'US','united states':'US',usa:'US',guyane:'GF','guyane francaise':'GF',reunion:'RE','la reunion':'RE',mayotte:'YT',
        allemagne:'DE',germany:'DE',deutschland:'DE',italie:'IT',italy:'IT',italia:'IT',belgique:'BE',suisse:'CH',cameroun:'CM',benin:'BJ',"cote d ivoire":'CI','burkina faso':'BF'};
      const rawCountry=clean(phoneCountryRaw), isoPhone=rawCountry?(aliases[key(rawCountry)]||country(rawCountry)):country(iso);
      if(rawCountry&&!/^[A-Z]{2}$/.test(isoPhone))return fail('Pays du téléphone : utilisez un code à deux lettres, par exemple DE, FR, CA ou MQ.');
      const plan=plans[isoPhone];
      const done=(value,note,usedCountry=null)=>({value,issue:'',note:[...notes,note].filter(Boolean).join(' '),original,
        changed:value!==original,country:usedCountry===null?isoPhone:usedCountry});
      const matchNSN=(d,p)=>{
        if(!p)return [];
        const c=[];
        if(p.re.test(d))c.push({nsn:d,stripped:false});
        if(p.trunk&&d.startsWith(p.trunk)&&p.re.test(d.slice(p.trunk.length)))
          c.push({nsn:d.slice(p.trunk.length),stripped:true});
        return c.filter((x,i,a)=>a.findIndex(y=>y.nsn===x.nsn)===i);
      };
      function international(d,originNote){
        if(!/^[1-9]\d{6,14}$/.test(d))return fail('Téléphone international : entre 7 et 15 chiffres, avec un indicatif non nul, attendus.');
        const ps=Object.entries(plans).filter(([,p])=>d.startsWith(p.cc));
        const long=ps.length?Math.max(...ps.map(([,p])=>p.cc.length)):0;
        const possible=ps.filter(([,p])=>p.cc.length===long);
        const exacts=possible.filter(([,p])=>p.re.test(d.slice(p.cc.length)));
        const exact=exacts.find(([c])=>c===isoPhone)||exacts[0];
        if(exact){
          // +1 est partagé : ne pas présenter un pays inféré comme une vérification.
          const shared=exact[1].cc==='1';
          return done('+'+d,originNote+' Indicatif fourni conservé (pays de livraison non imposé).'+
            (shared?' Indicatif +1 partagé; attribution et joignabilité non vérifiées.':''),
            shared&&!['CA','US'].includes(isoPhone)?'':exact[0]);
        }
        // Le 0 national après +33, +32, etc. n'appartient pas à l'E.164.
        // Ne jamais retirer le 0 significatif des pays sans préfixe national (BJ, CI, IT…).
        const untrunk=possible.filter(([,p])=>p.trunk&&d.slice(p.cc.length).startsWith(p.trunk))
          .map(([c,p])=>({c,p,d:p.cc+d.slice(p.cc.length+p.trunk.length)}))
          .filter(x=>x.p.re.test(x.d.slice(x.p.cc.length)));
        if(untrunk.length&&new Set(untrunk.map(x=>x.d)).size===1)
          return done('+'+untrunk[0].d,originNote+' Zéro national superflu retiré après l’indicatif.',untrunk[0].c);
        if(possible.length)return fail('Téléphone : longueur ou préfixe national incohérent avec l’indicatif +'+possible[0][1].cc+'.');
        // Pour les autres indicatifs explicites, conserver les chiffres au lieu
        // d'attribuer arbitrairement +33 : contrôle E.164 général seulement.
        return done('+'+d,originNote+' Format international conservé ; indicatif hors du contrôle national détaillé.', '');
      }
      if(s.startsWith('+'))return international(digits,'Format avec +.');
      if(digits.startsWith('00'))return international(digits.slice(2),'Préfixe international 00 converti en +.');
      if(['US','CA'].includes(isoPhone)&&digits.startsWith('011'))
        return international(digits.slice(3),'Préfixe international 011 converti en +.');

      // Pour le groupe France / DOM, distinguer les préfixes territoriaux des
      // mobiles métropolitains. Jamais de repli +33 pour une destination étrangère.
      const family=['FR','MQ','GP','GF','RE','YT','BL','MF'];
      let localPlan=plan,localCountry=isoPhone;
      if(!rawCountry&&family.includes(isoPhone)){
        const national=digits.length===10&&digits.startsWith('0')?digits.slice(1):digits;
        if(national.length===9){
          const territory=[['MQ',/^(?:596|598|696|697|7091)/],['GP',/^(?:590|690|691|7090)/],
            ['GF',/^(?:594|694)/],['RE',/^(?:262|263|692|693)/],['YT',/^(?:269|639)/]]
            .find(([,re])=>re.test(national));
          if(territory){localCountry=territory[0];localPlan=plans[localCountry];}
          else if(/^[67]/.test(national)&&!/^709/.test(national)){localCountry='FR';localPlan=plans.FR;}
        }
      }
      const candidates=[];
      for(const x of matchNSN(digits,localPlan))candidates.push({value:'+'+localPlan.cc+x.nsn,
        country:localCountry,note:`Numéro local ${localPlan.name} converti en +${localPlan.cc}.`+
          (localPlan.trunk&&!x.stripped?' Préfixe national de présentation omis, chiffres significatifs conservés.':'')});
      // Indicatif déjà présent sans le signe + : n'essayer que celui du pays
      // choisi, ou les indicatifs France/DOM dans le groupe correspondant.
      const intPlans=family.includes(isoPhone)&&!rawCountry?family.map(c=>[c,plans[c]]):plan?[[isoPhone,plan]]:[];
      for(const [c,p] of intPlans){
        if(!digits.startsWith(p.cc))continue;
        const rest=digits.slice(p.cc.length);
        for(const x of matchNSN(rest,p))candidates.push({value:'+'+p.cc+x.nsn,country:c,
          note:'Indicatif +'+p.cc+' reconnu sans le signe +.'+(x.stripped?' Zéro national superflu retiré.':'')});
      }
      const unique=candidates.filter((c,i,a)=>a.findIndex(x=>x.value===c.value)===i);
      if(unique.length===1)return done(unique[0].value,unique[0].note,unique[0].country);
      if(unique.length>1)return fail('Téléphone ambigu : plusieurs interprétations possibles. Précisez le pays du téléphone ou saisissez +indicatif.');
      if(['CA','US'].includes(isoPhone))return fail('Téléphone '+localPlan.name+' : un numéro national complet de 10 chiffres est attendu (indicatif régional inclus), éventuellement précédé de 1 ou +1. Ne pas inventer de chiffres manquants.');
      if(!plan)return fail('Numéro local : pays non pris en charge par les règles locales ('+isoPhone+'). Renseignez +indicatif ou le pays du téléphone dans Corriger.');
      return fail('Téléphone incomplet, préfixe répété ou format incompatible avec '+plan.name+'. Vérifiez le pays du téléphone et les chiffres, sans ajouter +33 au hasard.');
    }

exports.normalizeLaPostePhone = (raw,destination) => {
  const original=clean(raw);
  // À la source, une notation E+ demande une vérification, même si sa valeur peut se développer.
  if(/[eE][+-]?\d+\s*$/.test(original)) return {value:original,original,note:'',error:"Téléphone en notation scientifique : vérifier les chiffres complets dans la commande SCA."};
  if(typeof raw==='number'&&(!Number.isSafeInteger(raw)||raw<0))return {value:original,original,note:'',error:'Téléphone numérique de précision non garantie.'};
  const result=phone(original,destination);
  return {value:result.value,original,note:result.note,error:result.issue||undefined};
};
