FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY apps/api/JovieJoy.Api.csproj ./apps/api/
RUN dotnet restore ./apps/api/JovieJoy.Api.csproj
COPY apps/api/ ./apps/api/
RUN dotnet publish ./apps/api/JovieJoy.Api.csproj -c Release -o /out /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /out ./
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
ENTRYPOINT ["dotnet", "JovieJoy.Api.dll"]
