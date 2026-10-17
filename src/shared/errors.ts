export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Requisição inválida.") {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Não autenticado.") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Acesso restrito.") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado.") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflito de dados.") {
    super(message, 409);
  }
}
