import sys
import pypdf
from pathlib import Path

contenu = Path(r'c:\Users\hp\Desktop\nova\front\contenu')
for pdf in contenu.glob('*.pdf'):
    try:
        r = pypdf.PdfReader(str(pdf))
        t = ''.join((p.extract_text() or '') for p in r.pages[:3])
        if 'couleur' in t.lower() or 'design' in t.lower() or 'poppins' in t.lower():
            print('FILE:', pdf.name)
            print(t[:1500])
            print('---')
    except Exception as e:
        print(pdf.name, e)
