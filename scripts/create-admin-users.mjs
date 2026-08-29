import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const rt = await prisma.rTUnit.findUnique({
    where: {
      kodeRT_kodeRW: {
        kodeRT: "011",
        kodeRW: "005",
      },
    },
  });

  if (!rt) {
    throw new Error("RT 011 / RW 005 tidak ditemukan.");
  }

  const passwordHash = await bcrypt.hash("1234", 12);

  const accounts = [
    {
      username: "ketua011",
      role: "KETUA",
    },
    {
      username: "sekretaris011",
      role: "SEKRETARIS",
    },
    {
      username: "bendahara011",
      role: "BENDAHARA",
    },
  ];

  for (const account of accounts) {
    await prisma.user.upsert({
      where: {
        username: account.username,
      },
      update: {
        role: account.role,
        passwordHash,
        rTUnitId: rt.id,
      },
      create: {
        username: account.username,
        passwordHash,
        role: account.role,
        rTUnitId: rt.id,
      },
    });
  }

  console.log("AKUN PENGURUS RT 011 BERHASIL DIBUAT");
  console.log("RTUnit:", rt.namaRT, rt.kodeRT + "/" + rt.kodeRW);
  console.log("ketua011 / 1234");
  console.log("sekretaris011 / 1234");
  console.log("bendahara011 / 1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
