import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Base de datos en memoria para el mock
interface SessionInfo {
  sessionId: string;
  userName: string;
  companyDb: string;
  createdAt: number;
}

const activeSessions = new Map<string, SessionInfo>();
let orderSequence = 1000;

// Middleware de autenticación por Cookie B1SESSION
function authenticateB1Session(req: Request, res: Response, next: NextFunction) {
  const b1Session = req.cookies['B1SESSION'] || (req.headers['authorization']?.replace('Bearer ', ''));
  
  if (!b1Session || !activeSessions.has(b1Session)) {
    return res.status(401).json({
      error: {
        code: 301,
        message: {
          lang: 'en-us',
          value: 'Invalid or expired session. Please login again.'
        }
      }
    });
  }

  // Verificar timeout de 30 minutos (1800 segundos)
  const session = activeSessions.get(b1Session)!;
  const now = Date.now();
  if (now - session.createdAt > 30 * 60 * 1000) {
    activeSessions.delete(b1Session);
    return res.status(401).json({
      error: {
        code: 301,
        message: {
          lang: 'en-us',
          value: 'Session timed out.'
        }
      }
    });
  }

  next();
}

// 1. POST /b1s/v2/Login
app.post('/b1s/v2/Login', (req: Request, res: Response) => {
  const { CompanyDB, UserName, Password } = req.body;

  if (!CompanyDB || !UserName || !Password) {
    return res.status(400).json({
      error: {
        code: -1,
        message: { lang: 'en-us', value: 'CompanyDB, UserName, and Password are required.' }
      }
    });
  }

  const sessionId = uuidv4();
  activeSessions.set(sessionId, {
    sessionId,
    userName: UserName,
    companyDb: CompanyDB,
    createdAt: Date.now()
  });

  // Establecer cookies idénticas a SAP Business One Service Layer
  res.cookie('B1SESSION', sessionId, { httpOnly: true, path: '/b1s/v2' });
  res.cookie('ROUTEID', '.node1', { path: '/b1s/v2' });

  return res.status(200).json({
    'odata.metadata': `http://localhost:${PORT}/b1s/v2/$metadata#B1Sessions/@Element`,
    SessionId: sessionId,
    Version: '1000190',
    SessionTimeout: 30
  });
});

// 2. POST /b1s/v2/Logout
app.post('/b1s/v2/Logout', (req: Request, res: Response) => {
  const b1Session = req.cookies['B1SESSION'];
  if (b1Session) {
    activeSessions.delete(b1Session);
  }
  res.clearCookie('B1SESSION', { path: '/b1s/v2' });
  res.clearCookie('ROUTEID', { path: '/b1s/v2' });
  return res.status(204).send();
});

// 3. GET /b1s/v2/BusinessPartners
app.get('/b1s/v2/BusinessPartners', authenticateB1Session, (req: Request, res: Response) => {
  return res.status(200).json({
    'odata.metadata': `http://localhost:${PORT}/b1s/v2/$metadata#BusinessPartners`,
    value: [
      {
        CardCode: 'C20000',
        CardName: 'Norm Thompson',
        CardType: 'cCustomer',
        CurrentAccountBalance: 14250.00,
        Currency: 'USD'
      },
      {
        CardCode: 'C30000',
        CardName: 'Micro-chips Corp',
        CardType: 'cCustomer',
        CurrentAccountBalance: 0.00,
        Currency: 'USD'
      }
    ]
  });
});

// 4. POST /b1s/v2/Orders (Crear Pedido de Venta)
app.post('/b1s/v2/Orders', authenticateB1Session, (req: Request, res: Response) => {
  const { CardCode, DocumentLines, DocDueDate } = req.body;

  if (!CardCode || !DocumentLines || !Array.isArray(DocumentLines) || DocumentLines.length === 0) {
    return res.status(400).json({
      error: {
        code: -2028,
        message: { lang: 'en-us', value: 'CardCode and DocumentLines with at least one item are required.' }
      }
    });
  }

  orderSequence += 1;
  const docEntry = orderSequence;
  const docNum = orderSequence;

  let totalAmount = 0;
  const processedLines = DocumentLines.map((line: any, index: number) => {
    const lineTotal = (line.Quantity || 1) * (line.UnitPrice || 0);
    totalAmount += lineTotal;
    return {
      LineNum: index,
      ItemCode: line.ItemCode,
      Quantity: line.Quantity,
      UnitPrice: line.UnitPrice,
      LineTotal: lineTotal
    };
  });

  return res.status(201).json({
    'odata.metadata': `http://localhost:${PORT}/b1s/v2/$metadata#Orders/@Element`,
    DocEntry: docEntry,
    DocNum: docNum,
    DocType: 'dDocument_Items',
    DocDate: req.body.DocDate || new Date().toISOString().split('T')[0],
    DocDueDate: DocDueDate || new Date().toISOString().split('T')[0],
    CardCode: CardCode,
    DocTotal: totalAmount,
    DocumentLines: processedLines
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Mock SAP Business One Service Layer v2`);
  console.log(` Running on: http://localhost:${PORT}/b1s/v2`);
  console.log(` Endpoints:`);
  console.log(`   POST /b1s/v2/Login`);
  console.log(`   POST /b1s/v2/Logout`);
  console.log(`   GET  /b1s/v2/BusinessPartners`);
  console.log(`   POST /b1s/v2/Orders`);
  console.log(`====================================================`);
});
