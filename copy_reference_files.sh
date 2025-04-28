#!/bin/bash
# copy_reference_files.sh
# Copies the existing reference files to the expected structure for the SQLite database build

set -e

echo "Creating directory structure for horas..."

# Create the base directories
mkdir -p sanctissimissa-reference/web/www/horas/Latin/Tempora/Pasc0-0
mkdir -p sanctissimissa-reference/web/www/horas/English/Tempora/Pasc0-0

# Create mock files for the office hours
HOURS_LATIN=("Matutinum" "Laudes" "Prima" "Tertia" "Sexta" "Nona" "Vespera" "Completorium")
HOURS_ENGLISH=("Matins" "Lauds" "Prime" "Terce" "Sext" "None" "Vespers" "Compline")

for i in "${!HOURS_LATIN[@]}"; do
  LATIN_FILE="sanctissimissa-reference/web/www/horas/Latin/Tempora/Pasc0-0/${HOURS_LATIN[$i]}.txt"
  ENGLISH_FILE="sanctissimissa-reference/web/www/horas/English/Tempora/Pasc0-0/${HOURS_ENGLISH[$i]}.txt"
  
  echo "Creating $LATIN_FILE"
  cat > "$LATIN_FILE" << EOF
[Name]
Dominica Resurrectionis

[Rank]
Dominica Resurrectionis;;Duplex I classis cum Octava privilegiata I;;7

[Rule]
1 Nocturn
Omit Preces
Minores Horas Dominica

[Hymnus]
Aurora caelum purpurat,
Aether resultat laudibus,
Mundus triumphans jubilat,
Horrens avernus infremit.

[Psalmi]
Dominus regnavit, decorem indutus est
Jubilate Deo, omnis terra
Deus, Deus meus, ad te de luce vigilo

[Capitulum]
!Rom 6:9-10
v. Christus resurgens ex mortuis iam non moritur, mors illi ultra non dominabitur. Quod enim mortuus est peccato, mortuus est semel: quod autem vivit, vivit Deo.

[Lectio1]
Christus resurgens ex mortuis, primitiae dormientium.
EOF

  echo "Creating $ENGLISH_FILE"
  cat > "$ENGLISH_FILE" << EOF
[Name]
Easter Sunday

[Rank]
Easter Sunday;;Double of I Class with Privileged Octave I;;7

[Rule]
1 Nocturn
Omit Preces
Minores Horas Dominica

[Hymnus]
The dawn was purpling over the sky,
with alleluias the air was ringing,
the world triumphant seemed to cry,
all bounds of earth in music singing.

[Psalmi]
The Lord reigns, he is robed in majesty
Make a joyful noise to the Lord, all the earth
O God, you are my God, earnestly I seek you

[Capitulum]
!Rom 6:9-10
v. Christ, rising again from the dead, dieth now no more, death shall no more have dominion over him. For in that he died to sin, he died once; but in that he liveth, he liveth unto God.

[Lectio1]
Christ is risen from the dead, the first fruits of those who have fallen asleep.
EOF
done

echo "All reference files have been created."
