# ARBAL — Execution des Corrections d'Audit

## Ordre prioritaire (defini par tech lead)

---

## P0 — BLOQUANT PRODUCTION

### Tache 1: Fix Guardian persistence
**Fichiers**: `backend/src/modules/students/dto/student.dto.ts`, `backend/src/modules/students/students.service.ts`

Ajouter les champs guardian au `CreateStudentDto` et `UpdateStudentDto`, et creer le `Guardian` dans la transaction du service backend.

DTO a modifier:
- `CreateStudentDto`: ajouter `namaAyah`, `pekerjaanAyah`, `ktpAyah`, `teleponAyah`, `namaIbu`, `pekerjaanIbu`, `ktpIbu`, `teleponIbu`, `teleponOrangTua`, `alamatOrangTua` (tous `@IsOptional() @IsString()`)
- `UpdateStudentDto`: ajouter les memes champs optionnels

Service a modifier:
- `studentsService.create()`: ajouter `guardian: { create: {...} }` dans la transaction
- `studentsService.update()`: ajouter `guardian: { upsert: {...} }` pour mettre a jour ou creer

### Tache 2: Fix actorUserId
**Fichiers**: `prisma/schema.prisma`, `backend/src/modules/activity/activity.service.ts`, `src/services/activity.service.ts`

Rendre `actorUserId` nullable dans le schema Prisma et utiliser `req.user.id` au lieu de `'SYSTEM'`.

Schema:
```prisma
actorUserId String?  // was String
User         User?   @relation(fields: [actorUserId], references: [id])
```

Frontend (`activity.service.ts` L63-72): supprimer `actorUserId: 'SYSTEM'` du body — ne plus l'envoyer du tout. Le backend utilisera `req.user.id` automatiquement.

Backend (`activity.service.ts` L34): garder `dto.actorUserId ?? null` comme fallback.

Controller (`activity.controller.ts` L27): injecter `@Req() req` et passer `req.user.id` comme `actorUserId` par defaut.

### Tache 3: Fix replaceAll no-op
**Fichiers**: `src/services/student.service.ts`, `src/hooks/useStudents.ts`

Remplacer le stub `replaceAll` par un vrai appel API en boucle.

Option retenue: `Promise.all(ids.map(id => studentService.remove(id)))` dans le hook `useReplaceStudentsMutation`.

Modifier `useReplaceStudentsMutation` pour:
- Recevoir la liste complete des etudiants mis a jour
- Comparer avec la liste actuelle pour trouver les supprimes
- Appeler `studentService.remove(id)` pour chaque etudiant supprime

---

## P1 — HAUTE PRIORITE

### Tache 4: Notification persistence (DB)
**Fichiers**: `prisma/schema.prisma`, nouveau fichier `backend/src/modules/notifications/`

Ajouter une table `Notification` et des endpoints REST:

Schema:
```prisma
model Notification {
  id        String   @id
  userId    String
  title     String
  message   String
  type      String   // info, success, warning
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
  User      User     @relation(fields: [userId], references: [id])
  @@index([userId, read])
}
```

Creer `NotificationsModule` avec:
- `GET /api/v1/notifications` — liste pour l'utilisateur courant
- `POST /api/v1/notifications` — creer une notification
- `PATCH /api/v1/notifications/mark-all-read` — marquer tout comme lu
- `DELETE /api/v1/notifications/:id` — supprimer une notification

Remplacer le service frontend `notificationService` (in-memory) par des vrais appels API.

### Tache 5: Secure cookie via env
**Fichier**: `backend/src/modules/auth/auth.controller.ts`

Remplacer `secure: false` par `secure: process.env.NODE_ENV === 'production'`.

### Tache 6: Log permission hardening
**Fichier**: `backend/src/modules/activity/activity.controller.ts`

Forcer `actorUserId` depuis `req.user.id` dans le endpoint `POST /logs`, ignorer toute valeur envoyee par le client.

---

## P2 — PRIORITE MOYENNE

### Tache 7: Sync enum DocumentStatus
**Fichiers**: `prisma/schema.prisma`, `src/types.ts`

Ajouter `BELUM_LENGKAP` a l'enum `DocumentStatus` du backend et mapper correctement dans `DB_DOC_STATUS_MAP` du frontend.

### Tache 8: Fix actorRole hardcoded dans mapBackendLog
**Fichier**: `src/services/activity.service.ts`

Inclure `User.Role` dans la reponse backend (`include: { User: { select: { name: true, Role: { select: { name: true } } } } }`) et mapper `User.Role.name` vers le `RoleType` frontend.

### Tache 9: Remove dead code
**Fichiers**: `src/mockData.ts`, `package.json`

- Supprimer `src/mockData.ts` (452 lignes, plus importe nulle part)
- Supprimer `@google/genai` des dependances (`npm uninstall @google/genai`)
- Renommer `package.json` name de `react-example` a `arbal`
- Supprimer `vite` duplique (garder dans devDependencies)

---

## P3 — OCR END-TO-END (non mentionne dans l'audit, ajoute par tech lead)

### Tache 10: Verifier le pipeline OCR E2E
Verifier que le flux complet fonctionne:
- Upload d'un fichier KTP reel via le frontend
- Fichier sauvegarde dans `backend/uploads/`
- `POST /api/v1/documents/:id/ocr` appelle le Python OCR
- Resultat JSON stocke dans `Document.ocrResult`
- UI de review (pas d'auto-fill)

Si le test echoue, debugger le pipeline OCR.

---

## Ordre d'execution

```
1. Guardian persistence    (P0)
2. actorUserId fix         (P0)
3. replaceAll fix          (P0)
4. Notification DB         (P1)
5. Secure cookie env       (P1)
6. Log permission          (P1)
7. Enum sync               (P2)
8. Role mapping            (P2)
9. Remove dead code        (P2)
```
