from app.api.response import success_response, ApiResponse, ResponseCode
from pydantic import BaseModel


class DemoDTO(BaseModel):
    name: str
    val: int


def test_success_response_with_dto():
    dto = DemoDTO(name="test", val=123)
    res = success_response(dto, code=ResponseCode.CREATED)
    assert res == {
        "code": 201,
        "message": "success",
        "data": {"name": "test", "val": 123}
    }


def test_success_response_with_dict():
    data = {"key": "value"}
    res = success_response(data, code=ResponseCode.SUCCESS)
    assert res == {
        "code": 200,
        "message": "success",
        "data": {"key": "value"}
    }


def test_api_response_schema():
    resp = ApiResponse[DemoDTO](code=ResponseCode.SUCCESS, message="ok", data=DemoDTO(name="demo", val=1))
    assert resp.code == 200
    assert resp.data.name == "demo"
