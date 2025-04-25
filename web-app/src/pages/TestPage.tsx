import React from 'react';
import MassText from '../components/mass/MassText';
import OfficeText from '../components/office/OfficeText';

/**
 * A simple test page to verify that our components are working correctly
 */
const TestPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Component Test Page</h1>
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Mass Text Component Test</h2>
        <div className="bg-white shadow-md rounded-lg p-6">
          <MassText
            id="test-mass"
            part="proper"
            title={{
              latin: "Dominica Resurrectionis",
              english: "Easter Sunday"
            }}
            introit={{
              latin: "Resurrexi, et adhuc tecum sum, alleluia: posuisti super me manum tuam, alleluia: mirabilis facta est scientia tua, alleluia, alleluia.",
              english: "I have risen, and I am with you still, alleluia. You have laid your hand upon me, alleluia. Too wonderful for me, this knowledge, alleluia, alleluia.",
              reference: "Ps 138:18,5-6",
              rubric: "The priest approaches the altar and makes the sign of the cross."
            }}
            collect={{
              latin: "Deus, qui hodierna die per Unigenitum tuum aeternitatis nobis aditum devicta morte reserasti: vota nostra, quae praeveniendo aspiras, etiam adjuvando prosequere.",
              english: "O God, who on this day, through your Only Begotten Son, have conquered death and unlocked for us the path to eternity, grant, we pray, that we who keep the solemnity of the Lord's Resurrection may, through the renewal brought by your Spirit, rise up in the light of life.",
              ending: "Per eundem Dominum nostrum Jesum Christum, Filium tuum, qui tecum vivit et regnat in unitate Spiritus Sancti, Deus, per omnia saecula saeculorum. Amen."
            }}
            epistle={{
              latin: "Fratres: Expurgate vetus fermentum, ut sitis nova conspersio, sicut estis azymi. Etenim Pascha nostrum immolatus est Christus. Itaque epulemur: non in fermento veteri, neque in fermento malitiae et nequitiae: sed in azymis sinceritatis et veritatis.",
              english: "Brethren: Purge out the old leaven, that you may be a new paste, as you are unleavened. For Christ our Pasch is sacrificed. Therefore, let us feast, not with the old leaven, nor with the leaven of malice and wickedness, but with the unleavened bread of sincerity and truth.",
              reference: "1 Cor 5:7-8",
              introduction: "Lectio Epistolae beati Pauli Apostoli ad Corinthios."
            }}
            showLatinOnly={false}
            showEnglishOnly={false}
            showRubrics={true}
          />
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Office Text Component Test</h2>
        <div className="bg-white shadow-md rounded-lg p-6">
          <OfficeText
            id="test-office"
            hour="lauds"
            title={{
              latin: "Ad Laudes",
              english: "Lauds"
            }}
            hymn={{
              latin: "Aurora caelum purpurat,\nAether resultat laudibus,\nMundus triumphans jubilat,\nHorrens avernus infremit.",
              english: "The dawn is purpling the sky,\nHeaven echoes with hymns of praise,\nThe world exults in triumph,\nHell trembles in fear."
            }}
            psalms={[
              {
                number: 92,
                title: {
                  latin: "Dominus regnavit",
                  english: "The Lord reigns"
                },
                text: {
                  latin: "Dominus regnavit, decorem indutus est: indutus est Dominus fortitudinem, et praecinxit se.",
                  english: "The Lord reigns, he is clothed with majesty: the Lord is clothed with strength, and has girded himself."
                },
                antiphon: {
                  latin: "Angelus autem Domini descendit de caelo, et accedens revolvit lapidem, et sedebat super eum, alleluia, alleluia.",
                  english: "An angel of the Lord descended from heaven, and coming, rolled back the stone, and sat upon it, alleluia, alleluia."
                }
              }
            ]}
            chapter={{
              latin: "Fratres: Si consurrexistis cum Christo, quae sursum sunt quaerite, ubi Christus est in dextera Dei sedens: quae sursum sunt sapite, non quae super terram.",
              english: "Brethren: If you be risen with Christ, seek the things that are above, where Christ is sitting at the right hand of God: mind the things that are above, not the things that are upon the earth.",
              reference: "Col 3:1-2"
            }}
            showLatinOnly={false}
            showEnglishOnly={false}
            showRubrics={true}
          />
        </div>
      </div>
    </div>
  );
};

export default TestPage;
