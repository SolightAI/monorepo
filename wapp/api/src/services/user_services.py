from dto.models import User as UserModel


async def get_user(
    id: int | None = None,
    email: str | None = None,
    url: str| None = None,
):

    if id is not None:
        return await UserModel.filter(id=id).first()

    if email is not None:
        return await UserModel.filter(email=email).first()

    if url is not None:
        return await UserModel.filter(url=url.lower()).first()

    raise RuntimeError("No parameter provided to search for user")
